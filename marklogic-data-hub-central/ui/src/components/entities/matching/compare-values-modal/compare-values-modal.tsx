import "./compare-values-modal.scss";

import {HCButton, HCTable} from "@components/common";
import React, {useContext, useEffect, useState} from "react";
import {faExclamationTriangle, faInfoCircle} from "@fortawesome/free-solid-svg-icons";

import {CurationContext} from "@util/curation-context";
import {Definition} from "../../../../types/modeling-types";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {Modal} from "react-bootstrap";
import {Overlay} from "react-bootstrap";
import Popover from "react-bootstrap/Popover";
import {SearchContext} from "@util/search-context";
import backgroundImage from "../../../../assets/white-for-dark-bg.png";
import styles from "./compare-values-modal.module.scss";

interface Props {
  isVisible: any;
  toggleModal: (isVisible: boolean) => void;
  previewMatchActivity: any;
  uriInfo: any;
  activeStepDetails: any;
  entityProperties: any;
  uriCompared: any;
  entityDefinitionsArray: any;
  uris: any
  isPreview: boolean;
  isMerge: boolean;
  mergeUris: any;
  unmergeUri: any;
  originalUri: string;
  flowName: string;
}

const CompareValuesModal: React.FC<Props> = (props) => {
  let property1, property2;
  const {curationOptions} = useContext(CurationContext);
  const [compareValuesTableData, setCompareValuesTableData] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [showUrisPopover, setShowUrisPopover] = useState(false);
  const [targetUrisPopover, setTargetUrisPopover] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const {
    searchOptions,
    toggleMergeUnmerge,
  } = useContext(SearchContext);

  useEffect(() => {
    if (props.isVisible && props.uriInfo) {
      let parsedData = parseDefinitionsToTable(props.entityDefinitionsArray, getMatchedProperties());
      setCompareValuesTableData(parsedData);
    }
  }, [props.isVisible]);

  const DEFAULT_ENTITY_DEFINITION: Definition = {
    name: "",
    properties: []
  };

  const getMatchedProperties = () => {
    let matchedPropArray: any = [];
    for (let i in props.previewMatchActivity.actionPreview) {
      let allUris = props.previewMatchActivity.actionPreview[i].uris;
      if (allUris.includes(props.uris[0]) && allUris.includes(props.uris[1])) {
        for (let j in props.previewMatchActivity.actionPreview[i].matchRulesets) {
          let matchRuleset = props.previewMatchActivity.actionPreview[i].matchRulesets[j];
          let name = matchRuleset.split(" - ");
          if (name.length > 1) {
            matchedPropArray.push(name[0]);
          } else {
            for (let i = 0; i < curationOptions.activeStep.stepArtifact.matchRulesets.length; i++) {
              let ruleset = curationOptions.activeStep.stepArtifact.matchRulesets[i];
              if (ruleset.name === matchRuleset) {
                for (let j = 0; j < ruleset.matchRules.length; j++) {
                  matchedPropArray.push(ruleset.matchRules[j].entityPropertyPath);
                }
              }
            }
          }
        }
      }
    }
    return matchedPropArray;
  };

  const closeModal = () => {
    props.toggleModal(false);
  };

  const getPropertyPath = (parentKeys: any, structuredTypeName: string, propertyName: string, propertyPath?: string, arrayIndex?: number, parentPropertyName?: string) => {
    let updatedPropertyPath = "";
    if (!propertyPath) {
      if (parentPropertyName && arrayIndex !== undefined && arrayIndex >= 0) {
        parentKeys.forEach(parentsKey => {
          let key = parentsKey.split(",")[0];
          if (key === parentPropertyName) {
            return !updatedPropertyPath.length ? updatedPropertyPath = `${key}[${arrayIndex}]` : updatedPropertyPath = updatedPropertyPath + "." + `${key}[${arrayIndex}]`;
          } else {
            return !updatedPropertyPath.length ? updatedPropertyPath = key : updatedPropertyPath = updatedPropertyPath + "." + key;
          }
        });
      } else {
        parentKeys.forEach(parentsKey => !updatedPropertyPath.length ? updatedPropertyPath = parentsKey.split(",")[0] : updatedPropertyPath = updatedPropertyPath + "." + parentsKey.split(",")[0]);
      }
      updatedPropertyPath = updatedPropertyPath + "." + structuredTypeName + "." + propertyName;
    } else {
      updatedPropertyPath = propertyPath + "." + structuredTypeName + "." + propertyName;
    }
    return updatedPropertyPath;
  };

  const propertyValueFromPath = (propertyPath, initialObj) => {
    let localPropertyPath = propertyPath.split(".").reduce((arrObject, curr) => {
      if (curr.indexOf("[") !== -1) {
        let updatedCurr = curr.slice(0, curr.indexOf("["));
        let index = curr.slice(curr.indexOf("[") + 1, curr.indexOf("]"));
        if (arrObject[updatedCurr] && Array.isArray(arrObject[updatedCurr])) {
          return arrObject[updatedCurr][index];
        } else {
          return arrObject[updatedCurr] ? arrObject[updatedCurr] : "";
        }
      } else {
        return (arrObject === undefined || !arrObject[curr]) ? "" : arrObject[curr];
      }
    }, initialObj);
    return localPropertyPath;
  };

  const getPropertyPathForStructuredProperties = (parentKeys: any, propertyName: string) => {
    let propertyPath = "";
    parentKeys.forEach(parentsKey => !propertyPath.length ? propertyPath = parentsKey : propertyPath = propertyPath === parentsKey ? propertyPath : propertyPath + "." + parentsKey);
    propertyPath = propertyPath + "." + propertyName;
    return propertyPath;
  };

  const parseDefinitionsToTable = (entityDefinitionsArray: Definition[], matchedPropertiesArray) => {
    let activeEntityName = props.isPreview ? props.activeStepDetails.entityName : props.activeStepDetails[0].name;
    let entityTypeDefinition: Definition = entityDefinitionsArray.find(definition =>  definition.name === activeEntityName) || DEFAULT_ENTITY_DEFINITION;
    return entityTypeDefinition?.properties.map((property, index) => {
      let propertyRow: any = {};
      let counter = 0;
      let propertyValueInURI1 = "";
      let propertyValueInURI2 = "";
      if (props.uriInfo) {
        property1 = props.uriInfo[0]["result1Instance"][activeEntityName];
        property2 = props.uriInfo[1]["result2Instance"][activeEntityName];
      }
      if (property.datatype === "structured") {
        const parseStructuredProperty = (entityDefinitionsArray, property, parentDefinitionName, parentKey, parentKeys, allParentKeys, propertyPath, indexArray?: number, localParentKey?: string) => {
          let parsedRef = property.ref.split("/");
          if (indexArray === undefined) {
            if (parentKey && !parentKeys.includes(parentKey)) {
              parentKeys.push(parentKey);
            } else {
              parentKeys.push(property.name + "," + index + (counter + 1));
            }
          }
          if (localParentKey && !allParentKeys.includes(localParentKey)) {
            allParentKeys.push(localParentKey);
          } else {
            if (!allParentKeys.includes(localParentKey)) {
              allParentKeys.push(property.name);
            }
          }

          if (parsedRef.length > 0 && parsedRef[1] === "definitions") {
            let updatedPropertyPath = propertyPath ? propertyPath : property.name;
            let URI1Value: any = propertyValueFromPath(updatedPropertyPath, property1);
            let URI2Value: any = propertyValueFromPath(updatedPropertyPath, property2);
            let arrLength = 0;
            if ((URI1Value && Array.isArray(URI1Value)) || (URI2Value && Array.isArray(URI2Value))) {
              arrLength = URI1Value.length > URI2Value.length ? URI1Value.length : URI2Value.length;
            }
            let structuredType = entityDefinitionsArray.find(entity => entity.name === parsedRef[2]);
            let structuredTypePropertiesArray: any = [];
            let structuredTypeProperties: any;
            if (arrLength > 0) {
              let parentKeysTempArray = [...parentKeys];
              for (let i = 0; i < arrLength; i++) {
                let allParentKeysTempArray = [...allParentKeys];
                let structTypeProperties = structuredType?.properties.map((structProperty, structIndex) => {
                  if (structProperty.datatype === "structured") {
                    // Recursion to handle nested structured types
                    counter++;
                    let parentDefinitionName = structuredType.name;
                    let immediateParentKey = (parentKey !== "" ? property.name : structProperty.name) + "," + index + counter + i;
                    let localParentKey = structProperty.name;
                    let propertyPathUri = propertyPath ? propertyPath : getPropertyPath(parentKeysTempArray, structuredType.name, structProperty.name, undefined, i, property.name);
                    return parseStructuredProperty(entityDefinitionsArray, structProperty, parentDefinitionName, immediateParentKey, parentKeysTempArray, allParentKeysTempArray, propertyPathUri, i, localParentKey);
                  } else {
                    let allParentKeysArray = [...allParentKeysTempArray];
                    let updatedPropertyPath = getPropertyPath(parentKeysTempArray, structuredType.name, structProperty.name, propertyPath, i, property.name);
                    let propertyValueInURI1 = propertyValueFromPath(updatedPropertyPath, property1);
                    let propertyValueInURI2 = propertyValueFromPath(updatedPropertyPath, property2);
                    let localPropertyPath = getPropertyPathForStructuredProperties(allParentKeysArray, structProperty.name);
                    let matchedRow = propertyValueInURI1 && propertyValueInURI2 ? matchedPropertiesArray.includes(localPropertyPath) : false;
                    return {
                      key: property.name + "," + index + structIndex + counter + i,
                      propertyValueInURI1: {value: propertyValueInURI1, matchedRow: matchedRow},
                      propertyValueInURI2: {value: propertyValueInURI2, matchedRow: matchedRow},
                      structured: structuredType.name,
                      propertyName: {name: structProperty.name, matchedRow: matchedRow},
                      propertyPath: updatedPropertyPath,
                      type: structProperty.datatype === "structured" ? structProperty.ref.split("/").pop() : structProperty.datatype,
                      multiple: structProperty.multiple ? structProperty.name : "",
                      hasChildren: false,
                      hasParent: true,
                      parentKeys: allParentKeysArray,
                    };
                  }
                });
                let parentKeysArray = [...parentKeysTempArray];
                let arrayRow = {
                  key: property.name + "," + index + i + counter,
                  propertyValueInURI1: {value: propertyValueInURI1, matchedRow: false},
                  propertyValueInURI2: {value: propertyValueInURI2, matchedRow: false},
                  structured: structuredType.name,
                  propertyName: {name: (i + 1) + " " + structuredType.name, matchedRow: matchedPropertiesArray.includes(property.name)},
                  propertyPath: getPropertyPath(parentKeysArray, structuredType.name, structuredType.name, propertyPath, i),
                  children: structTypeProperties,
                  hasChildren: true,
                  hasParent: true,
                  parentKeys: allParentKeys
                };
                structuredTypePropertiesArray.push(arrayRow);
              }

            } else {
              structuredTypeProperties = structuredType?.properties.map((structProperty, structIndex) => {
                if (structProperty.datatype === "structured") {
                  // Recursion to handle nested structured types
                  counter++;
                  let parentDefinitionName = structuredType.name;
                  let immediateParentKey = (parentKey !== "" ? property.name : structProperty.name) + "," + index + counter;
                  let propertyPath = getPropertyPath(parentKeys, structuredType.name, structProperty.name);
                  return parseStructuredProperty(entityDefinitionsArray, structProperty, parentDefinitionName, immediateParentKey, parentKeys, allParentKeys, propertyPath);
                } else {
                  let parentKeysArray = [...parentKeys];
                  let allParentKeysArray = [...allParentKeys];
                  let updatedPropertyPath = getPropertyPath(parentKeys, structuredType.name, structProperty.name, propertyPath);
                  let propertyValueInURI1 = propertyValueFromPath(updatedPropertyPath, property1);
                  let propertyValueInURI2 = propertyValueFromPath(updatedPropertyPath, property2);
                  let localPropertyPath = getPropertyPathForStructuredProperties(allParentKeysArray, structProperty.name);
                  let matchedRow = !propertyValueInURI1 || !propertyValueInURI2 ? false : matchedPropertiesArray.includes(localPropertyPath);
                  return {
                    key: property.name + "," + index + structIndex + counter,
                    propertyValueInURI1: {value: propertyValueInURI1, matchedRow: matchedRow},
                    propertyValueInURI2: {value: propertyValueInURI2, matchedRow: matchedRow},
                    structured: structuredType.name,
                    propertyName: {name: structProperty.name, matchedRow: matchedRow},
                    propertyPath: getPropertyPath(parentKeysArray, structuredType.name, structProperty.name, propertyPath),
                    type: structProperty.datatype === "structured" ? structProperty.ref.split("/").pop() : structProperty.datatype,
                    multiple: structProperty.multiple ? structProperty.name : "",
                    hasChildren: false,
                    hasParent: true,
                    parentKeys: allParentKeysArray
                  };
                }
              });
            }

            let hasParent = parentKey !== "";
            let allParentKeysArray = [...allParentKeys];
            return {
              key: property.name + "," + index + counter,
              structured: structuredType.name,
              propertyValueInURI1: {value: "", matchedRow: false},
              propertyValueInURI2: {value: "", matchedRow: false},
              propertyName: {name: property.name, matchedRow: matchedPropertiesArray.includes(property.name)},
              propertyPath: hasParent ? getPropertyPath(parentKeys, structuredType.name, property.name, propertyPath) : property.name,
              multiple: property.multiple ? property.name : "",
              type: property.ref.split("/").pop(),
              children: arrLength ? structuredTypePropertiesArray : structuredTypeProperties,
              hasChildren: true,
              hasParent: hasParent,
              parentKeys: hasParent ? allParentKeysArray : []
            };
          }
        };
        propertyRow = parseStructuredProperty(entityDefinitionsArray, property, "", undefined, [], [], "");
        counter++;
      } else {
        // To handle non structured properties
        if (props.uriInfo !== undefined) {
          propertyValueInURI1 = property1[property.name];
          propertyValueInURI2 = property2[property.name];
          if (propertyValueInURI1 === undefined || propertyValueInURI2 === undefined || Array.isArray(propertyValueInURI1) || Array.isArray(propertyValueInURI2) || (typeof propertyValueInURI1 === "object") || (typeof propertyValueInURI2 === "object")) {
            propertyValueInURI1 = "";
            propertyValueInURI2 = "";
          }
        }
        let matchedRow = !propertyValueInURI1 || !propertyValueInURI2 ? false : matchedPropertiesArray.includes(property.name);

        propertyRow = {
          key: property.name + "," + index,
          propertyValueInURI1: {value: propertyValueInURI1, matchedRow: matchedRow},
          propertyValueInURI2: {value: propertyValueInURI2, matchedRow: matchedRow},
          propertyName: {name: property.name, matchedRow: matchedRow},
          propertyPath: property.name,
          type: property.datatype,
          identifier: entityTypeDefinition?.primaryKey === property.name ? property.name : "",
          multiple: property.multiple ? property.name : "",
          hasChildren: false,
          parentKeys: []
        };
      }
      return propertyRow;
    });
  };

  const columns = [
    {
      dataField: "propertyName",
      key: "propertyPath",
      title: (cell) => `${cell.name}`,
      ellipsis: true,
      width: "20%",
      style: (property) => {
        if (property?.matchedRow) {
          return {
            backgroundColor: "#85BF97",
            width: "20%",
            backgroundImage: "url(" + backgroundImage + ")",
          };
        }
        return {
          backgroundColor: "",
          width: "20%",
        };
      },
      formatter: (text, row) => {
        return <span className={row.hasOwnProperty("children") ? styles.nameColumnStyle : ""} aria-label={text.name}>{text.name}</span>;
      },
    },
    {
      dataField: "propertyValueInURI1",
      key: "propertyValueInURI1",
      title: (cell) => `${cell.value}`,
      ellipsis: true,
      width: "40%",
      style: (property) => {
        if (property?.matchedRow) {
          return {
            backgroundColor: "#85BF97",
            width: "40%",
            backgroundImage: "url(" + backgroundImage + ")",
          };
        }
        return {
          backgroundColor: "",
          width: "40%",
        };
      },
      formatter: (property, key) => {
        return <span key={key} aria-label={(property.value && property.value.length > 0) ? `${property.value}-cell1` : "empty-cell1"}>{property.value}</span>;
      }
    },
    {
      dataField: "propertyValueInURI2",
      key: "propertyValueInURI2",
      title: (cell) => `${cell.value}`,
      ellipsis: true,
      width: "calc(40% - 50px)",
      style: (property) => {
        if (property?.matchedRow) {
          return {
            backgroundColor: "#85BF97",
            width: "calc(40% - 50px)",
            backgroundImage: `url(${backgroundImage})`,
          };
        }
        return {
          backgroundColor: "",
          width: "calc(40% - 50px)",
        };
      },
      formatter: (property, key) => {
        return <span key={key} aria-label={(property.value && property.value.length > 0) ? `${property.value}-cell2` : "empty-cell2"}>{property.value}</span>;
      }
    },
  ];

  const onExpand = (record, expanded, rowIndex) => {
    let newExpandedRows = [...expandedRows];

    if (expanded) {
      if (newExpandedRows.indexOf(record.key) === -1) {
        newExpandedRows.push(record.key);
      }
    } else {
      newExpandedRows = newExpandedRows.filter(row => row !== record.key);
    }

    setExpandedRows(newExpandedRows);
  };

  const rowStyle2 = (row) => {
    const {propertyName} = row;
    if (propertyName?.matchedRow) {
      return {
        backgroundColor: "#85BF97",
        backgroundImage: "url(" + backgroundImage + ")",
      };
    }

    return {};
  };


  const onMergeUnmerge = async () => {
    setIsLoading(true);
    setConfirmModalVisible(false);

    if (!props.isMerge) {
      let payload = {
        mergeDocumentURI: props.originalUri
      };
      await props.unmergeUri(payload);
      setIsLoading(false);
    } else {
      let payload = {
        mergeURIs: props.uris,
        flowName: props.flowName
      };
      await props.mergeUris(payload);
      setIsLoading(false);
    }
    closeModal();
    toggleMergeUnmerge(searchOptions.mergeUnmerge);
  };

  const handleShowUrisPopover = (event) => {
    setShowUrisPopover(!showUrisPopover);
    setTargetUrisPopover(event.target);
  };

  const moreUrisInfo = (
    <Overlay
      show={showUrisPopover}
      target={targetUrisPopover}
      placement="right"
    >
      <Popover id={`more-uris-tooltip`} className={styles.moreUrisPopover}
        onMouseEnter={() => setShowUrisPopover(true)}
        onMouseLeave={() => setShowUrisPopover(false)}>
        <Popover.Body className={styles.moreUrisPopover}>
          {props.uriCompared.length < 30 ?
            <div className={styles.moreUrisInfo} aria-label="more-uri-info">All URIs included in this {props.isMerge? "merge" : "unmerge"} are displayed below (<strong>{props.uriCompared.length} total</strong>): <br/><br/>{props.uriCompared.map((uri, index) => { return <span className={styles.uriText} aria-label={`${uri}-uri`}>{uri}<br/></span>; })}</div>
            :
            <div>
              <div className={styles.moreUrisInfo} aria-label="more-uri-info-limit">The first <strong>30</strong> URIs included in this {props.isMerge? "merge" : "unmerge"} are displayed below (<strong>{props.uriCompared.length} total</strong>): <br/><br/>{props.uriCompared.map((uri, index) => { return index < 30 ? <span className={styles.uriText} aria-label={`${uri}-uri`}>{uri}<br/></span> : null; })}</div>
              <span>...</span>
            </div>
          }
        </Popover.Body>
      </Popover>
    </Overlay>
  );

  const mergeUnmergeConfirmation = (
    <Modal show={confirmModalVisible} dialogClassName={styles.confirmationModal}>
      <Modal.Body>
        <div style={{display: "flex"}}>
          <div style={{padding: "24px 0px 0px 15px"}}>
            <FontAwesomeIcon icon={faExclamationTriangle} size="lg" style={{color: "rgb(188, 129, 29)"}}></FontAwesomeIcon>
          </div>
          <div style={{fontSize: "16px", padding: "20px 20px 20px 20px"}}>
            {props.isMerge ?
              "Are you sure you want to merge these documents? Doing so will combine them to form one single document. The original documents will be moved to the archive collection."
              :
              "Are you sure you want to unmerge this document? Doing so will move the original documents out of the archive collection."
            }
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <HCButton variant="outline-light" onClick={() => setConfirmModalVisible(false)}>
          <div aria-label="No">No</div>
        </HCButton>
        <HCButton variant="primary" onClick={() => onMergeUnmerge()}>
          <div aria-label="Yes">Yes</div>
        </HCButton>
      </Modal.Footer>
    </Modal>
  );

  return <><Modal
    show={props.isVisible}
    size={"lg"}
    dialogClassName={styles.modal1400w}
    aria-label={"compare-values-modal"}
  >
    <Modal.Header className={"bb-none"}>
      <span className={styles.compareValuesModalHeading}>Compare</span>
      {
        props.uriCompared.length > 2 ?
          <div className={styles.moreUrisTrigger}>
            {moreUrisInfo}
            <FontAwesomeIcon icon={faInfoCircle} aria-label="icon: info-circle" className={styles.infoIcon} onMouseEnter={handleShowUrisPopover} onMouseLeave={() => setShowUrisPopover(false)}/>
          </div>
          :
          null
      }

      <button type="button" className="btn-close" aria-label="Close" onClick={closeModal}></button>
    </Modal.Header>
    <Modal.Body>
      <div>
        <div>
          <span className={styles.entity1}>{props.entityDefinitionsArray[0]?.name} 1</span>
          <span className={styles.entity2}>{props.entityDefinitionsArray[0]?.name} 2</span>
        </div>
        <div className={styles.compareTableHeader}>
          <span className={styles.uri1}>{props.uriCompared[0]}</span>
          <span className={styles.uri2}>{props.uriCompared[1]}</span>
        </div>
        <span><img src={backgroundImage} className={styles.matchIcon}></img></span>
        <span className={styles.matchIconText}>Match</span>
      </div>
      <div>
        <HCTable columns={columns}
          className={`compare-values-model ${styles.compareValuesModelTable}`}
          data={compareValuesTableData}
          onExpand={onExpand}
          expandedRowKeys={expandedRows}
          showExpandIndicator={{bordered: false}}
          nestedParams={{headerColumns: columns, iconCellList: [], state: [expandedRows, setExpandedRows]}}
          childrenIndent={true}
          pagination={true}
          rowStyle={rowStyle2}
          keyUtil="key"
          baseIndent={0}
          rowKey="key"
          showHeader={false}
        />
      </div>
    </Modal.Body>
    {!props.isPreview ?
      <Modal.Footer>
        <HCButton variant="outline-light" onClick={() => closeModal()}>
          <div aria-label="Cancel">Cancel</div>
        </HCButton>
        <HCButton variant="primary" loading={isLoading}  aria-label="confirm-merge-unmerge" onClick={() => setConfirmModalVisible(true)}>
          {props.isMerge ? "Merge" : "Unmerge"}
        </HCButton>
      </Modal.Footer> : null}
  </Modal>
  {mergeUnmergeConfirmation}
  </>;
};

export default CompareValuesModal;
