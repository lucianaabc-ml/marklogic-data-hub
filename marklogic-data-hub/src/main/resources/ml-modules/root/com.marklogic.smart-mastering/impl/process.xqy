xquery version "1.0-ml";

(:
 : This is an implementation library, not an interface to the Smart Mastering functionality.
 :
 : Match-and-merge combines the two primary functions of Smart Mastering in a
 : single call. This means that both happen in the same transaction. When
 : called this way, the actions configured on thresholds in the match options
 : are taken automatically, rather than individually by the client.
 :)

module namespace proc-impl = "http://marklogic.com/smart-mastering/process-records/impl";

import module namespace blocks-impl = "http://marklogic.com/smart-mastering/blocks-impl"
  at "/com.marklogic.smart-mastering/matcher-impl/blocks-impl.xqy";
import module namespace config = "http://marklogic.com/data-hub/config"
  at "/com.marklogic.hub/config.xqy";
import module namespace const = "http://marklogic.com/smart-mastering/constants"
  at "/com.marklogic.smart-mastering/constants.xqy";
import module namespace fun-ext = "http://marklogic.com/smart-mastering/function-extension"
  at "../function-extension/base.xqy";
import module namespace matcher = "http://marklogic.com/smart-mastering/matcher"
  at "/com.marklogic.smart-mastering/matcher.xqy";
import module namespace match-impl = "http://marklogic.com/smart-mastering/matcher-impl"
  at "/com.marklogic.smart-mastering/matcher-impl/matcher-impl.xqy";
import module namespace match-opt-impl = "http://marklogic.com/smart-mastering/options-impl"
  at "/com.marklogic.smart-mastering/matcher-impl/options-impl.xqy";
import module namespace merging = "http://marklogic.com/smart-mastering/merging"
  at "/com.marklogic.smart-mastering/merging.xqy";
import module namespace merge-impl = "http://marklogic.com/smart-mastering/survivorship/merging"
  at "/com.marklogic.smart-mastering/survivorship/merging/base.xqy",
     "/com.marklogic.smart-mastering/survivorship/merging/options.xqy";
import module namespace notify-impl = "http://marklogic.com/smart-mastering/notification-impl"
  at "/com.marklogic.smart-mastering/matcher-impl/notification-impl.xqy";
import module namespace util-impl = "http://marklogic.com/smart-mastering/util-impl"
  at "/com.marklogic.smart-mastering/impl/util.xqy";
import module namespace coll-impl = "http://marklogic.com/smart-mastering/survivorship/collections"
  at "/com.marklogic.smart-mastering/survivorship/merging/collections.xqy";
import module namespace coll = "http://marklogic.com/smart-mastering/collections"
  at "collections.xqy";
import module namespace tel = "http://marklogic.com/smart-mastering/telemetry"
  at "/com.marklogic.smart-mastering/telemetry.xqy";
import module namespace httputils = "http://marklogic.com/data-hub/http-utils"
  at "/data-hub/5/impl/http-utils.xqy";

declare option xdmp:mapping "false";

declare function proc-impl:process-match-and-merge($input as item()*)
  as item()*
{
  let $merging-options := merging:get-JSON-options()
  return
    if (fn:exists($merging-options)) then
      for $merge-options in $merging-options
      let $match-options := matcher:get-options(fn:string($merge-options/merging:match-options), $const:FORMAT-XML)
      return
        proc-impl:process-match-and-merge-with-options-save($input, $merge-options, $match-options, cts:true-query(), fn:false())
    else
      httputils:throw-bad-request($const:NO-MERGE-OPTIONS-ERROR, "No Merging Options are present. See: https://marklogic-community.github.io/smart-mastering-core/docs/merging-options/")
};

declare function proc-impl:process-match-and-merge(
  $input as item()*,
  $option-name as xs:string,
  $filter-query as cts:query)
  as item()*
{
  let $all-options :=
    xdmp:invoke-function(
      function() {
        let $merge-options := merging:get-JSON-options($option-name)
        let $match-options-name := $merge-options/options/matchOptions/fn:string()
        let $match-options := matcher:get-options($match-options-name, $const:FORMAT-XML)
        return
          map:map()
            => map:with("merge-options", $merge-options)
            => map:with("match-options", $match-options)
      },
      map:entry("update", "false")
    )
  return
    proc-impl:process-match-and-merge-with-options-save(
      $input,
      $all-options => map:get("merge-options"),
      $all-options => map:get("match-options"),
      $filter-query,
      fn:false()
    )
};

declare variable $STRING-TOKEN := "##";

(:
 : Given a map with keys that are URIs and values that are the result elements from running the match function against
 : that URI's document, produce a map where the key is a generated unique ID and the values are sequences of URIs to be
 : merged. We want to eliminate redundant cases, such as merge(docA, docB) and merge(docB, docA).
 : @param $matches - map:map stores search results by URI
 : @param $match-options - the match options for the query
 : @param $max-scan - max number of search results to return
 : @param $merge-threshold - max score needed for a merge
 : @param $filter-query - cts:query that restricts the search
 : @param $lock-for-update - boolean indicating whether we should lock on a URI
 : @param $provenance-map - optional map:map to track provenance information about matching
 : @return  map(unique ID -> sequence of URIs)
 :)
declare function proc-impl:consolidate-merges(
  $matches as map:map,
  $matching-options,
  $max-scan,
  $merge-threshold,
  $filter-query,
  $lock-for-update as xs:boolean,
  $provenance-map as map:map?
) as map:map
{
  map:new((
    let $merges :=
      fn:distinct-values(
        for $key in map:keys($matches)
        let $match-results := map:get($matches, $key)
        (: If $max-scan is less than the total results for a URI, up max scan to avoid large nuber of recursive searches for additional URIs :)
        let $max-scan := fn:max(($match-results/@total ! xs:integer(.), $max-scan))
        let $merge-items as element()* := $match-results/result[@action=$const:MERGE-ACTION]
        let $merge-uris as xs:string* := $merge-items/@uri
        let $_lock-for-update := if ($lock-for-update) then ($merge-uris ! merge-impl:lock-for-update(.)) else ()
        where fn:exists($merge-uris)
        return (
          if (fn:exists($provenance-map)) then
            proc-impl:record-match-provenance(
              $provenance-map,
              $key,
              $merge-items
            )
          else (),
          let $additional-uris :=
            proc-impl:expand-uris-for-merge(
              $merge-uris,
              (),
              $matches,
              $matching-options,
              $max-scan,
              $merge-threshold,
              $filter-query,
              $lock-for-update,
              $provenance-map
            )
          return
            fn:string-join(
              for $uri in fn:distinct-values(($key, $merge-uris, $additional-uris))
              order by $uri
              return $uri,
              $STRING-TOKEN
            )
        )
      )
    for $merge in $merges
    let $uris := fn:tokenize($merge, $STRING-TOKEN)
    let $merge-id := fn:head((
      $uris[fn:starts-with(., $merge-impl:MERGED-DIR)] ! fn:replace(fn:substring-after(., $merge-impl:MERGED-DIR), "\.(json|xml)", ""),
      xdmp:md5($merge)
    ))
    return
      map:entry($merge-id, $uris)
  ))
};

(:
 : This expands out searches to find any documents that may exist
 : @param $current-uris - xs:string* URIs that we just discovered with the last search
 : @param accumulated-uris - xs:string* URIs that we've discovered so far
 : @param $matches - map:map stores search results by URI
 : @param $match-options - the match options for the query
 : @param $max-scan - max number of search results to return
 : @param $merge-threshold - max score needed for a merge
 : @param $filter-query - cts:query that restricts the search
 : @param $lock-for-update - boolean indicating whether we should lock on a URI
 : @param $provenance-map - optional map:map to track provenance information about matching
 : @return  xs:string* URIs found for the merge
 :)
declare function proc-impl:expand-uris-for-merge(
  $current-uris as xs:string*,
  $accumulated-uris as xs:string*,
  $matches as map:map,
  $matching-options,
  $max-scan,
  $merge-threshold,
  $filter-query,
  $lock-for-update as xs:boolean,
  $provenance-map as map:map?
) (: as xs:string* ~leaving off for tail recursion~ :)
{
  let $accumulated-uris := fn:distinct-values(($current-uris, $accumulated-uris))
  let $additional-uris :=
    fn:distinct-values(
      (: We already know at this point that the $accumulated-uris and $current-uris will be merged :)
      let $docs-to-exclude-map := map:entry("docsToExclude", $accumulated-uris)
      let $sub-filter-query-fun := if ($filter-query instance of cts:true-query) then
          function($docs-to-exclude) {
            cts:not-query(cts:document-query($docs-to-exclude))
          }
        else
          function($docs-to-exclude) {
            cts:and-not-query($filter-query, cts:document-query($docs-to-exclude))
          }
      (: This is an optimization to reduce the number of SPARQL calls :)
      let $_prime-blocks-cache := blocks-impl:get-blocks-of-uris($current-uris[fn:not(map:contains($matches,.))])
      for $merge-uri in $current-uris
      return
        if (map:contains($matches,$merge-uri)) then
          map:get($matches, $merge-uri)/result[@action=$const:MERGE-ACTION]/@uri[fn:not(. = $accumulated-uris)] ! fn:string(.)
        else
          let $docs-to-exclude := map:get($docs-to-exclude-map, "docsToExclude")
          let $sub-filter-query := $sub-filter-query-fun($docs-to-exclude)
          let $results :=
            match-impl:find-document-matches-by-options(
              fn:doc($merge-uri),
              $matching-options,
              1,
              $max-scan,
              $merge-threshold,
              (: don't include detailed match information :)
              fn:false(),
              $sub-filter-query,
              (: return results :)
              fn:true(),
              (: short-circuit redundant searches :)
              fn:true()
            )[result/@action = $const:MERGE-ACTION]
          where fn:exists($results)
          return
            let $merge-items := $results/result[@action = $const:MERGE-ACTION]
            let $merge-item-uris := $merge-items/@uri ! fn:string(.)
            return (
              map:put($docs-to-exclude-map, "docsToExclude", ($merge-item-uris, map:get($docs-to-exclude-map, "docsToExclude"))),
              map:put($matches, $merge-uri, $results),
              $merge-item-uris,
              if (fn:exists($provenance-map)) then
                proc-impl:record-match-provenance(
                  $provenance-map,
                  $merge-uri,
                  $merge-items
                )
              else ()
            )
    )
  let $_lock-for-update := if ($lock-for-update) then ($additional-uris ! merge-impl:lock-for-update(.)) else ()
  return
    if (fn:empty($additional-uris)) then
      $accumulated-uris
    else
      proc-impl:expand-uris-for-merge(
        $additional-uris,
        $accumulated-uris,
        $matches,
        $matching-options,
        $max-scan,
        $merge-threshold,
        $filter-query,
        $lock-for-update,
        $provenance-map
      )
};

declare function proc-impl:record-match-provenance(
  $provenance-map as map:map,
  $uri as xs:string,
  $merge-items as element()*
) {
  if (fn:not(map:contains($provenance-map, $uri))) then
    map:put(
      $provenance-map,
      $uri,
      map:entry($uri,
          map:new((
            for $merge-item in $merge-items
            return map:entry(
              fn:string($merge-item/@uri),
              map:new((
                map:entry("$action", fn:string($merge-item/@action)),
                 for $match in $merge-item/matches/match
                 let $ruleset-name := fn:string($match/rulesetName)
                 let $weight := fn:number($match/@weight)
                 order by fn:number($match/@weight) descending, $ruleset-name
                 return
                    map:entry(
                        $ruleset-name,
                      map:map()
                        => map:with("weight", $weight)
                        => map:with("matchedRules", json:to-array(
                              for $contribution in $match/contributions
                              let $node-name := fn:string($contribution/nodeName)
                              let $path := fn:string($contribution/path)
                              let $algorithm := fn:string($contribution/algorithm)
                              let $values :=
                                  for $value in fn:distinct-values(($contribution/value ! fn:string(.)))
                                  order by $value
                                  return $value
                              order by $node-name, $algorithm
                              return
                                map:map()
                                  => map:with("nodeName", $node-name)
                                  => map:with("path", $path)
                                  => map:with("matchedAlgorithm", map:entry("name", $algorithm))
                                  => map:with("matchedValues", json:to-array($values))
                            )
                          )
                      )
                )
              ))
            )
          )
      )
    )
  else ()
};

declare function proc-impl:consolidate-notifies($all-matches as map:map, $merged-into as map:map)
  as xs:string*
{
  fn:distinct-values(
    for $key in map:keys($all-matches)
    for $updated-key in
      (if (map:contains($merged-into, $key)) then
        map:get($merged-into, $key)
      else
        $key)
    let $key-notifications := map:get($all-matches, $key)/result[@action=$const:NOTIFY-ACTION]
    let $key-thresholds := fn:distinct-values($key-notifications/@threshold)
    for $key-threshold in $key-thresholds
    let $updated-notification-uris :=
      for $key-notification in $key-notifications[@threshold = $key-threshold]
      let $key-uri as xs:string := $key-notification/@uri
      let $updated-uri :=
        if (map:contains($merged-into, $key-uri)) then
          map:get($merged-into, $key-uri)
        else
          $key-uri
      return $updated-uri
    let $distinct-uris := fn:distinct-values(($updated-key, $updated-notification-uris))
    let $sorted-distinct-uris := for $uri in $distinct-uris order by $uri return $uri
    where fn:count($sorted-distinct-uris) > 1
    return fn:string-join(($key-threshold, $sorted-distinct-uris), $STRING-TOKEN)
  )
};

(: The following will store URIs of documents merged in transaction :)
declare variable $merges-in-transaction as map:map := map:map();
(: The following will store URIs of documents notified in transaction :)
declare variable $notifications-in-transaction as map:map := map:map();
(: The following will store URIs of documents notified in transaction :)
declare variable $no-matches-in-transaction as map:map := map:map();

(:
 : Build out summary information about actions to take based off matching
 :)
declare function proc-impl:build-match-summary(
  $input as item()*,
  $match-options as item(),
  $filter-query as cts:query,
  $fine-grain-provenance as xs:boolean,
  $lock-for-update as xs:boolean
) as json:object
{
(: increment usage count :)
  tel:increment(),
  let $start-elapsed := xdmp:elapsed-time()
  let $compiled-matching-options := match-opt-impl:compile-match-options($match-options, ())
  let $match-options-node := $compiled-matching-options => map:get("normalizedOptions")
  let $archived-collection := coll:archived-collections($match-options-node)
  let $normalized-input :=
    if ($input instance of xs:string*) then
      for $doc in cts:search(fn:doc(), cts:and-not-query(cts:document-query($input), cts:collection-query($archived-collection)), "unfiltered")
      return
        util-impl:build-write-object-for-doc($doc)
    else if ($input instance of map:map*) then
      $input
    else ()
  let $uris := $normalized-input ! map:get(., "uri")
  let $_prime-blocks-cache := blocks-impl:get-blocks-of-uris($uris)
  let $_ := if (xdmp:trace-enabled($const:TRACE-MATCH-RESULTS)) then
    xdmp:trace($const:TRACE-MATCH-RESULTS, "processing: " || fn:string-join($uris, ", "))
  else ()
  let $thresholds := map:get($compiled-matching-options, "orderedThresholds")
  let $minimum-threshold :=
    fn:min(
      $thresholds/score ! fn:number(.)
    )
  let $merge-threshold :=
    fn:min((
      $thresholds[action = $const:MERGE-ACTION]/score ! fn:number(.),
      999
    ))
  let $_min-threshold-err :=
    if (fn:empty($minimum-threshold)) then
      httputils:throw-bad-request($const:NO-THRESHOLD-ACTION-FOUND, ("No threshold actions to act on.", $thresholds))
    else ()
  let $max-scan := fn:head((
    $match-options-node//(*:max-scan|maxScan) ! xs:integer(.),
    500
  ))
  let $all-matches :=
    let $start-elapsed := xdmp:elapsed-time()
    let $matches :=
      map:new((
        $normalized-input !
        map:entry(
          (. => map:get("uri")),
          let $match-results := matcher:find-document-matches-by-options(
                (. => map:get("value")),
                $match-options,
                1,
                $max-scan,
                $minimum-threshold,
                $fine-grain-provenance,
                $filter-query
              )
           return (
             if ($lock-for-update) then
               $match-results/result[fn:exists(@action)]/@uri ! merge-impl:lock-for-update(fn:string(.))
             else (),
             $match-results
           )
        )
      ))
    return (
      $matches,
      if (xdmp:trace-enabled($const:TRACE-PERFORMANCE)) then
        xdmp:trace($const:TRACE-PERFORMANCE, "proc-impl:build-match-summary: Matches: " || (xdmp:elapsed-time() - $start-elapsed))
      else ()
    )
  let $provenance-map := if ($fine-grain-provenance) then map:map() else ()
  let $consolidated-merges := xdmp:eager(
    proc-impl:consolidate-merges($all-matches,
      $match-options,
      $max-scan,
      $merge-threshold,
      $filter-query,
      $lock-for-update,
      $provenance-map
    )
  )
  let $merged-hashes := map:keys($consolidated-merges)
  let $merged-into := map:map()
  let $merge-details :=
    (: Process merges :)
    let $start-elapsed := xdmp:elapsed-time()
    let $merges :=
      map:new((
        for $merge-hash in $merged-hashes
        where fn:not(map:contains($merges-in-transaction, $merge-hash))
        return (
          map:put($merges-in-transaction, $merge-hash, fn:true()),
          let $distinct-uris := fn:distinct-values(map:get($consolidated-merges, $merge-hash))
          let $first-merge-item := fn:head($distinct-uris)
          let $threshold := fn:distinct-values(map:get($all-matches, $first-merge-item)/result[@action = $const:MERGE-ACTION]/@threshold)
          let $merge-doc := fn:doc($first-merge-item)
          let $merge-uri :=  merge-impl:build-merge-uri(
            $merge-hash,
            if ($merge-doc instance of element() or
              $merge-doc instance of document-node(element())) then
              $const:FORMAT-XML
            else
              $const:FORMAT-JSON
          )
          let $_lock := if ($lock-for-update) then ($distinct-uris ! merge-impl:lock-for-update(.)) else ()
          let $prov-entry := if ($fine-grain-provenance) then (
            map:entry(
              "provenance",
              map:entry(
                $merge-uri,
                let $related-prov-maps := $distinct-uris ! map:get($provenance-map, .)
                let $match-information := map:new((
                  map:entry("destination", $merge-uri),
                  map:entry("type", "matchInformation"),
                  map:entry("matchedDocuments", util-impl:combine-maps(map:map(), $related-prov-maps))
                ))
                return
                  map:entry(
                    "matchInformation",
                    $match-information
                  )
              )
            )
          ) else ()
          return (
            $distinct-uris ! map:put($merged-into, ., $merge-uri),
            map:entry(
              $merge-uri,
              map:new((
                map:map()
                  => map:with("threshold", $threshold)
                  => map:with("action", "merge")
                  => map:with("uris", json:to-array($distinct-uris)),
                $prov-entry
              ))
            )
          )
        )
      ))
    return (
      $merges,
      if (xdmp:trace-enabled($const:TRACE-PERFORMANCE)) then
        xdmp:trace($const:TRACE-PERFORMANCE, "proc-impl:build-match-summary: ["||xdmp:request()||"] Merges: " || (xdmp:elapsed-time() - $start-elapsed))
      else ()
    )
  let $consolidated-notifies := proc-impl:consolidate-notifies($all-matches, $merged-into)
  let $notification-details :=
    let $start-elapsed := xdmp:elapsed-time()
    let $notifications :=
      (: Process notifications :)
      map:new((
        for $notification in $consolidated-notifies
        let $_lock := if ($lock-for-update) then (merge-impl:lock-for-update($notification)) else ()
        let $parts := fn:tokenize($notification, $STRING-TOKEN)
        let $threshold := fn:head($parts)
        let $uris := fn:tail($parts)
        let $notification-uri := notify-impl:build-notification-uri($threshold, $uris)
        let $prov-entry := if ($fine-grain-provenance) then (
          map:entry(
            "provenance",
            map:entry(
              $notification-uri,
              let $related-prov-maps := $uris ! map:get($provenance-map, .)
              let $match-information := map:new((
                map:entry("destination", $notification-uri),
                map:entry("type", "matchInformation"),
                map:entry("matchedDocuments", util-impl:combine-maps(map:map(), $related-prov-maps))
              ))
              return
                map:entry(
                  "matchInformation",
                  $match-information
                )
            )
          )
        ) else ()
        return
          map:entry(
            $notification-uri,
            map:new((
              map:map()
                => map:with("action", "notify")
                => map:with("threshold", $threshold)
                => map:with("uris", json:to-array($uris)),
              $prov-entry
            ))
          )
      ))
    return (
      $notifications,
      if (xdmp:trace-enabled($const:TRACE-PERFORMANCE)) then
        xdmp:trace($const:TRACE-PERFORMANCE, "proc-impl:build-match-summary:["||xdmp:request()||"] Notifications: " || (xdmp:elapsed-time() - $start-elapsed))
      else ()
    )
  let $uris-that-were-merged := map:keys($merged-into)
  let $no-matches-uris :=
    (: Process collections on no matches :)
    let $start-elapsed := xdmp:elapsed-time()
    let $no-matches := $uris[fn:not(. = $uris-that-were-merged)]
    return (
      $no-matches,
      if (xdmp:trace-enabled($const:TRACE-PERFORMANCE)) then
        xdmp:trace($const:TRACE-PERFORMANCE, "proc-impl:process-match-and-merge-with-options:["||xdmp:request()||"] No matches: " || (xdmp:elapsed-time() - $start-elapsed))
      else ()
    )
  let $action-map :=
    map:new((
      let $custom-thresholds := $thresholds[action = "custom"]
      for $custom-threshold in $custom-thresholds
      return
        map:entry(
          $custom-threshold/thresholdName,
          map:map()
            => map:with("action", $custom-threshold/action)
            => map:with("function", fn:string($custom-threshold/actionModuleFunction))
            => map:with("namespace", fn:string($custom-threshold/actionModuleNamespace))
            => map:with("at", fn:string($custom-threshold/actionModulePath))
        )
    ))
  let $custom-action-details :=
    map:new(
      for $uri in map:keys($all-matches)
      let $custom-actions := map:get($all-matches, $uri)/result[fn:not(./@action = ($const:NOTIFY-ACTION, $const:MERGE-ACTION))]
      where fn:exists($custom-actions)
      return
        map:entry($uri, map:new((
          map:entry("action", "customActions"),
          map:entry("actions", json:to-array(
            let $distinct-thresholds := fn:distinct-values($custom-actions/@threshold)
            for $custom-threshold in $distinct-thresholds
            return map:new((
              map:entry("thresholdName", $custom-threshold),
              map:get($action-map, $custom-threshold),
              map:entry("matchResults", proc-impl:matches-to-json($custom-actions[@threshold = $custom-threshold]))
            ))
          ))
        )))
    )
  let $action-details :=
    map:new((
      $notification-details,
      $merge-details,
      $custom-action-details
    ))
  let $match-summary := json:object()
      => map:with(
        "matchSummary",
        map:map()
        => map:with("URIsToProcess",
          json:to-array(fn:distinct-values(($no-matches-uris,map:keys($action-details)))))
        => map:with("actionDetails", $action-details)
      )
  return (
    $match-summary,
    if (xdmp:trace-enabled($const:TRACE-MATCH-RESULTS)) then
      xdmp:trace($const:TRACE-MATCH-RESULTS, "match-summary:["||xdmp:request()||"] " || xdmp:to-json-string($match-summary))
    else (),
    if (xdmp:trace-enabled($const:TRACE-PERFORMANCE)) then
      xdmp:trace($const:TRACE-PERFORMANCE, "proc-impl:build-match-summary:["||xdmp:request()||"] " || (xdmp:elapsed-time() - $start-elapsed))
    else ()
  )
};

(:
 : The workhorse function.
 :)
declare function proc-impl:process-match-and-merge-with-options(
  $input as item()*,
  $merge-options as item(),
  $matching-options as item(),
  $filter-query as cts:query,
  $fine-grain-provenance as xs:boolean
) as json:array
{
  (: increment usage count :)
  tel:increment(),
  let $start-elapsed := xdmp:elapsed-time()
  let $compiled-match-options := match-opt-impl:compile-match-options($matching-options, ())
  let $matching-options := $compiled-match-options => map:get("normalizedOptions")
  let $archived-collection := coll:archived-collections($matching-options)
  let $normalized-input :=
    if ($input instance of xs:string*) then
      for $doc in cts:search(fn:doc(), cts:and-not-query(cts:document-query($input), cts:collection-query($archived-collection)), "unfiltered")
      return
        util-impl:build-write-object-for-doc($doc)
    else if ($input instance of map:map*) then
      $input
    else ()
  let $write-objects-by-uri := util-impl:add-all-write-objects($normalized-input)
  let $match-summary := proc-impl:build-match-summary($normalized-input, $matching-options, $filter-query, $fine-grain-provenance, fn:true())
  let $uris-to-process := $match-summary => map:get("matchSummary") => map:get("URIsToProcess") => json:array-values()
  return (
    proc-impl:build-content-objects-from-match-summary(
      $uris-to-process,
      $match-summary,
      $merge-options,
      $fine-grain-provenance
    ),
    if (xdmp:trace-enabled($const:TRACE-PERFORMANCE)) then
      xdmp:trace($const:TRACE-PERFORMANCE, "proc-impl:process-match-and-merge-with-options:["||xdmp:request()||"] " || (xdmp:elapsed-time() - $start-elapsed))
    else ()
  )
};

declare variable $archived-in-transaction as map:map := map:map();
(:
 : Take the information from a match summary document and create the content objects necessary to
 : perform the actions.
 :)
declare function proc-impl:build-content-objects-from-match-summary(
    $uris as xs:string*,
    $match-summary as json:object,
    $merge-options as item(),
    $fine-grain-provenance as xs:boolean
) as json:array
{
  xdmp:trace($const:TRACE-MERGE-RESULTS, "Begin build-content-objects-from-match-summary"),
  let $start-elapsed := xdmp:elapsed-time()
  let $compiled-merge-options := merge-impl:compile-merge-options($merge-options)
  let $target-entity := $compiled-merge-options => map:get("targetEntityType")
  (: get info on how collections should be applied to documents :)
  let $merge-options-node := $compiled-merge-options => map:get("mergeOptionsNode")
  let $is-hub-central-format := fn:exists($merge-options-node/(mergeRules|targetCollections))
  let $on-no-match := $compiled-merge-options => map:get("onNoMatch")
  let $on-no-match-fun := coll-impl:on-no-match(?, $on-no-match)
  let $on-archive := $compiled-merge-options => map:get("onArchive")
  let $on-archive-fun := coll-impl:on-archive(?, $on-archive)
  let $on-merge := $compiled-merge-options => map:get("onMerge")
  let $match-summary-root := $match-summary => map:get("matchSummary")
  let $all-action-details := $match-summary-root => map:get("actionDetails")
  let $custom-action-function-map := map:map()
  let $results-array := json:to-array(
    for $uri in $uris
    let $action-details := $all-action-details => map:get($uri)
    return
      if (fn:empty($action-details)) then
        util-impl:adjust-collections-on-document(
          $uri,
          $on-no-match-fun
        )
      else
        let $action := $action-details => map:get("action")
        return
          switch ($action)
              case "merge" return
                let $uris-to-merge := $action-details => map:get("uris") => json:array-values()
                let $merged-doc-def := merge-impl:build-merge-models-by-uri($uris-to-merge, $merge-options, $uri)
                let $merged-doc := $merged-doc-def => map:get("value")
                let $merge-uri := $uri
                let $prov-entry :=
                      let $merge-provenance-info as map:map? := if ($fine-grain-provenance) then $merged-doc-def => map:get("provenance") else ()
                      let $match-provenance-info as map:map? := $action-details => map:get("provenance")
                      where fn:exists($merge-provenance-info) or fn:exists($match-provenance-info)
                      return map:entry("provenance",
                        if (fn:exists($merge-provenance-info) and fn:exists($match-provenance-info)) then
                          $merge-provenance-info + $match-provenance-info
                        else
                          fn:head(($match-provenance-info, $merge-provenance-info))
                      )
                let $uris-that-were-merged := $merged-doc-def => map:get("previousUri")
                return (
                  (: Archive documents :)
                  for $merged-uri in $uris-that-were-merged[fn:not(map:contains($all-action-details, .) or . = $merge-uri)]
                  where fn:not(map:contains($archived-in-transaction, $merged-uri))
                  return (
                    util-impl:adjust-collections-on-document(
                      $merged-uri,
                      $on-archive-fun
                    ),
                    map:put($archived-in-transaction, $merged-uri, fn:true())
                  ),
                  $merged-doc-def
                    => map:get("audit-trace")
                    => map:with("hidden", fn:true()),
                  map:new((
                    $merged-doc-def,
                    $prov-entry
                  ))
                )
              case "notify" return
                let $uris := $action-details => map:get("uris") => json:array-values()
                let $threshold := $action-details => map:get("threshold")
                let $provenance := $action-details => map:get("provenance")
                let $match-write-object := matcher:build-match-notification($threshold, $uris, $merge-options-node)
                where fn:exists($match-write-object)
                return
                  if (fn:exists($provenance)) then
                    map:new((
                      $match-write-object,
                      map:entry("provenance",
                        map:entry(
                          $match-write-object => map:get("uri"),
                          map:entry(
                            "matchInformation",
                            $provenance => map:get($uri)
                              => map:get("matchInformation")
                              => map:with("destination", $match-write-object => map:get("uri"))
                          )
                        )
                      )
                    ))
                  else
                    $match-write-object
              default return
                let $custom-actions := $action-details => map:get("actions") => json:array-values()
                for $custom-action in $custom-actions
                let $threshold-name := $custom-action => map:get("thresholdName")
                let $action-func :=
                  if (map:contains($custom-action-function-map, $threshold-name)) then
                    $custom-action-function-map => map:get($threshold-name)
                  else
                    let $action-func := fun-ext:function-lookup(
                                  $custom-action => map:get("function"),
                                  $custom-action => map:get("namespace"),
                                  $custom-action => map:get("at"),
                                  ()
                                )
                    return (
                      $custom-action-function-map => map:put($action, $action-func),
                      $action-func
                    )
                  let $_check-function-exists := if (fn:empty($action-func)) then
                    httputils:throw-bad-request(xs:QName("SM-CONFIGURATION"), ("Threshold action is not configured or not found", $action, $action-details))
                    else ()
                  let $custom-action-options :=
                    let $match-results := $custom-action => map:get("matchResults")
                    let $custom-action-options :=
                        map:new(
                          if (fn:ends-with(xdmp:function-module($action-func), "js")) then (
                            map:entry("match-results",$match-results),
                            map:entry("merge-options",
                                typeswitch($merge-options)
                                case object-node() return
                                  xdmp:from-json($merge-options)
                                case element() return
                                  merge-impl:options-to-json($merge-options)
                                default return
                                  $merge-options
                            )
                          )
                          else (
                            map:entry("match-results", proc-impl:matches-to-xml($match-results)),
                            map:entry("merge-options",
                                typeswitch($merge-options)
                                case element() return
                                  (fn:error((), "Should never hit this case"), $merge-options)
                                case object-node() return
                                  if ($is-hub-central-format) then
                                    $merge-options
                                  else
                                    (: FSnow 2/24/2021: one of the only places where we want to convert options from
                                       JSON to XML is here, where we are calling a custom XQuery merge action :)
                                    merge-impl:options-from-json($merge-options)
                                default return
                                  let $merge-node := xdmp:to-json($merge-options)
                                  return
                                    if ($is-hub-central-format) then
                                      $merge-node
                                    else
                                      merge-impl:options-from-json($merge-node)
                            )
                          )
                        )
                    return $custom-action-options
                  let $action-results :=
                      xdmp:apply(
                        $action-func,
                        $uri,
                        $custom-action-options => map:get("match-results"),
                        $custom-action-options => map:get("merge-options")
                      )
                  return (
                    $action-results,
                    if (fn:not(some $output in $action-results satisfies $output => map:get("uri") = $uri)) then (
                      util-impl:adjust-collections-on-document(
                          $uri,
                          $on-no-match-fun
                      )
                    ) else ()
                  )

      )
  return (
    $results-array,
    if (xdmp:trace-enabled($const:TRACE-MERGE-RESULTS)) then
      xdmp:trace($const:TRACE-MERGE-RESULTS, "proc-impl:build-content-objects-from-match-summary result:["||xdmp:request()||"] " || xdmp:to-json-string($results-array))
    else (),
    if (xdmp:trace-enabled($const:TRACE-PERFORMANCE)) then
      xdmp:trace($const:TRACE-PERFORMANCE, "proc-impl:build-content-objects-from-match-summary:["||xdmp:request()||"] " || (xdmp:elapsed-time() - $start-elapsed))
    else ())
};

(:
 : The workhorse function.
 :)
declare function proc-impl:process-match-and-merge-with-options-save(
  $input as item()*,
  $merge-options as item(),
  $match-options as item(),
  $filter-query as cts:query,
  $fine-grain-provenance as xs:boolean)
{
  let $actions as item()* := json:array-values(proc-impl:process-match-and-merge-with-options(
      $input,
      $merge-options,
      $match-options,
      $filter-query,
      $fine-grain-provenance
    ))
  for $action in $actions
  return
    if ($action instance of map:map) then
      let $uri as xs:string := $action => map:get("uri")
      let $context as map:map? := $action => map:get("context")
      let $permissions := $context => map:get("permissions")
      return (
        if (fn:not(($action => map:get("hidden")))) then
          ($action => map:get("value"))[fn:empty(xdmp:node-uri(.))]
        else (),
        xdmp:document-insert(
          $uri,
          $action => map:get("value"),
          map:new((
            map:entry("collections", $context => map:get("collections")),
            map:entry("permissions",
              if (fn:exists($permissions)) then $permissions
              else
                let $perms := xdmp:default-permissions($uri, "objects")
                return if (fn:exists($perms)) then $perms else config:get-default-data-hub-permissions()
            ),
            map:entry("metadata", $context => map:get("metadata"))
          ))
        )
      )
    else
      $action
};

(:
 : Convert the result elements into JSON objects.
 : TODO -- does not yet convert result/match elements to JSON. This is okay for now as there is no way to turn on the
 : $include-matches parameter from process-match-and-merge.
 :)
declare function proc-impl:matches-to-json($filtered-matches as element(result)*)
{
  array-node {
    for $match in $filtered-matches
    return object-node {
      "uri": $match/@uri/fn:string(),
      "score": $match/@score/fn:data(),
      "threshold": $match/@threshold/fn:string()
    }
  }
};

declare function proc-impl:matches-to-xml($filtered-matches as array-node()?)
{
  for $match in $filtered-matches/object-node()
  return element result {
    attribute uri { $match/uri/fn:string()},
    attribute score { $match/@score/fn:data()},
    attribute threshold { $match/@threshold/fn:string()}
  }
};
