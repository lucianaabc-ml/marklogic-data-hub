import React, {useState, useContext} from "react";
import {Card} from "antd";
import {Row, Col} from "react-bootstrap";
import Select from "react-select";
import reactSelectThemeConfig from "../../config/react-select-theme.config";
import styles from "./zero-state-explorer.module.scss";
import {SearchContext} from "../../util/search-context";
import graphic from "./explore_visual_big.png";
import {QueryOptions} from "../../types/query-types";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faStream, faTable, faThLarge} from "@fortawesome/free-solid-svg-icons";
import tiles from "../../config/tiles.config";
import {HCButton, HCCard, HCDivider, HCInput, HCTooltip} from "@components/common";

const ZeroStateExplorer = (props) => {
  const {
    searchOptions,
  } = useContext(SearchContext);

  const [dropDownValue, setDropdownValue] = useState<string>("All Entities");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [view, setView] = useState(props.tableView ? "table" : "snippet");
  const dropdownOptions = ["All Data", "-", "All Entities", "-", ...props.entities];
  const [zeroStatePageDatabase, setZeroStatePageDatabase] = useState("final");
  const [cardView, setCardView] = useState(false);

  const {
    applySaveQuery,
  } = useContext(SearchContext);

  const onClickExplore = () => {
    props.setCardView(cardView);
    props.toggleDataHubArtifacts(true);
    let options: QueryOptions = {
      searchText: searchQuery,
      entityTypeIds: dropDownValue === "All Entities" || dropDownValue === "All Data" ? [] : [dropDownValue],
      selectedFacets: {},
      selectedQuery: "select a query",
      propertiesToDisplay: [],
      zeroState: false,
      sortOrder: [],
      database: zeroStatePageDatabase,
    };
    applySaveQuery(options);
  };

  const handleOptionSelect = (option: any) => {
    setDropdownValue(option.value);
    if (option.value === "All Data") {
      setView("card");
      setCardView(true);
    } else {
      setView("table");
      setCardView(false);
      props.toggleTableView(true);
    }
  };

  const onChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const entityOptions = dropdownOptions.map(entity => ({value: entity, label: entity, isDisabled: entity === "-"}));

  const formatOptionLabel = ({value, label}) => {
    let renderEntity = value;
    if (value === "-") {
      return <HCDivider className={styles.dividerOption} />;
    } else if (value === "All Entities") {
      renderEntity = (
        <span className={styles.iconDropdownContainer}>
          <div id="all-entities" className="curateIcon"></div>
          <div>{label}</div>
        </span>
      );
    } else if (value === "All Data") {
      renderEntity = (
        <span className={styles.iconDropdownContainer}>
          <div id="all-data" className="loadIcon"></div>
          <div>{label}</div>
        </span>
      );
    }

    return (
      <span data-cy={`entity-option-${value}`}>
        {renderEntity}
      </span>
    );
  };

  const entityMenu = (
    <Select
      id="entity-select-wrapper"
      inputId="entity-select"
      value={entityOptions.find(item => item.value === dropDownValue)}
      onChange={handleOptionSelect}
      aria-label="entity-select"
      isSearchable={false}
      options={entityOptions}
      formatOptionLabel={formatOptionLabel}
      styles={{...reactSelectThemeConfig,
        container: (provided, state) => ({
          ...provided,
          height: "32px",
          width: "250px",
        }),
        control: (provided, state) => ({
          ...provided,
          border: "none",
          borderRadius: "4px 0px 0px 4px",
          borderColor: "none",
          boxShadow: "none",
          webkitBoxShadow: "none",
          backgroundColor: "#394494",
          minHeight: "34px",
          "&:hover": {
            borderColor: "none",
          },
          ":focus": {
            border: "none",
            boxShadow: "none",
            webkitBoxShadow: "none"
          }
        }),
        singleValue: (provided, state) => ({
          ...provided,
          color: "#ffffff",
        }),
      }}
    />
  );

  const onItemSelect = (selectedItem) => {
    props.queries.forEach(query => {
      if (selectedItem.value === query["savedQuery"]["name"]) {
        let options: QueryOptions = {
          searchText: query["savedQuery"]["query"]["searchText"],
          entityTypeIds: query["savedQuery"]["query"]["entityTypeIds"],
          selectedFacets: query["savedQuery"]["query"]["selectedFacets"],
          selectedQuery: query["savedQuery"]["name"],
          propertiesToDisplay: query.savedQuery.propertiesToDisplay,
          zeroState: false,
          sortOrder: query.savedQuery.sortOrder,
          database: searchOptions.database,
        };
        applySaveQuery(options);
      }
    });
  };

  const onViewChange = (val) => {
    setView(val);
    val === "table" ? props.toggleTableView(true) : props.toggleTableView(false);
  };

  const onDatabaseChange = (val) => {
    setZeroStatePageDatabase(val);
    if (val === "staging") {
      handleOptionSelect({value: "All Data"});
    } else {
      handleOptionSelect({value: "All Entities"});
    }
  };

  const queryOptions = props.queries?.length ? props.queries.map((key) => key.savedQuery.name).map((query, index) => ({value: query, label: query})) : {};

  return (
    <div id="zero-state-explorer" className={styles.container} >
      <div className={styles.zeroContent}>
        <Row className={"g-0"}>
          <Col md={9}>
            <p className={styles.intro}>{tiles.explore.intro}</p>
          </Col>
          <Col md={3} >
            <div className={styles.image}>
              <img className={styles.graphic} src={graphic} alt={""} />
            </div>
          </Col>
        </Row>
        <Row className={"g-0"}>
          <Col xs={12} className={"py-3"}>
            <p className={styles.p}>What do you want to explore?</p>
          </Col>
        </Row>
        <Row className={"g-0"}>
          <Col xs={12}>
            <div className={styles.box}>
              <HCCard className={styles.largeCard}>
                <Row className={"g-0"}>
                  <Col xs={12}>
                    <div className={styles.database}>
                      <p className={styles.databaseLabel}>Database:</p>
                      <div className={"switch-button-group"} id="database-switch">
                        <span>
                          <input
                            type="radio"
                            id="switch-database-final"
                            name="switch-database"
                            value={"final"}
                            defaultChecked={props.zeroStatePageDatabase === "final"}
                            onChange={e => onDatabaseChange(e.target.value)}
                          />
                          <label aria-label="switch-database-final" htmlFor="switch-database-final" className={`d-flex justify-content-center align-items-center ${styles.button}`}>
                            Final
                          </label>
                        </span>

                        <span>
                          <input
                            type="radio"
                            id="switch-database-staging"
                            name="switch-database"
                            value={"staging"}
                            defaultChecked={props.zeroStatePageDatabase === "staging"}
                            onChange={e => onDatabaseChange(e.target.value)}
                          />
                          <label aria-label="switch-database-staging" htmlFor="switch-database-staging" className={`d-flex justify-content-center align-items-center ${styles.button}`}>
                            Staging
                          </label>
                        </span>
                      </div>
                    </div>
                  </Col>
                </Row>
                <br />
                <Row>
                  <Col xs={12}>
                    <div className={styles.input}>
                      <HCInput
                        className={styles.searchBar}
                        placeholder="Enter text to search for"
                        addonBefore={entityMenu}
                        onChange={onChange}
                        allowClear
                        dataCy="search-bar"
                        dataTestid="search-bar"
                      />
                    </div>
                  </Col>
                </Row>
                <Row>
                  <Col xs={12} className={"py-3"}>
                    <div className={styles.viewAs}>
                      <p className={styles.viewAsLabel}>View As:</p>
                      <div className={"switch-button-group"}>
                        <HCTooltip
                          id="table-not-available-tooltip"
                          text={dropDownValue === "All Data" ? "View is not available for exploring all data." : ""}
                          placement="bottom"
                        >
                          <span>
                            <input
                              type="radio"
                              id="viewas-table"
                              name="viewas-radiogroup"
                              value={"table"}
                              disabled={dropDownValue === "All Data"}
                              checked={view === "table"}
                              onChange={e => onViewChange(e.target.value)}
                            />
                            <label aria-label="switch-view-table" htmlFor="viewas-table" className={`d-flex justify-content-center align-items-center`}>
                              <i className={styles.switchViewIcon}><FontAwesomeIcon icon={faTable} /></i>Table
                            </label>
                          </span>
                        </HCTooltip>

                        <HCTooltip
                          id="snippet-not-available"
                          text={dropDownValue === "All Data" ? "View is not available for exploring all data." : ""}
                          placement="bottom"
                        >
                          <span>
                            <input
                              type="radio"
                              id="viewas-snippet"
                              name="viewas-radiogroup"
                              value={"snippet"}
                              disabled={dropDownValue === "All Data"}
                              checked={view === "snippet"}
                              onChange={e => onViewChange(e.target.value)}
                            />
                            <label aria-label="switch-view-snippet" htmlFor="viewas-snippet" className={`d-flex justify-content-center align-items-center`}>
                              <i className={styles.switchViewIcon}><FontAwesomeIcon icon={faStream} /></i>Snippet
                            </label>
                          </span>
                        </HCTooltip>

                        <HCTooltip
                          id="card-not-available-tooltip"
                          text={dropDownValue !== "All Data" ? "View is not available for exploring entities." : ""}
                          placement="bottom"
                        >
                          <span aria-label="switch-view-card" id="viewAsCard">
                            <input
                              type="radio"
                              id="viewas-card"
                              name="viewas-radiogroup"
                              value={"card"}
                              disabled={dropDownValue !== "All Data"}
                              checked={view === "card"}
                              onChange={e => onViewChange(e.target.value)}
                            />
                            <label htmlFor="viewas-card" className={`d-flex justify-content-center align-items-center`}>
                              <i className={styles.switchViewIcon}><FontAwesomeIcon icon={faThLarge} /></i>Card
                            </label>
                          </span>
                        </HCTooltip>
                      </div>
                    </div>
                  </Col>
                </Row>
                <Row>
                  <br />
                  <Col xs={12}>
                    <div className={styles.exploreButton}>
                      <HCButton variant="primary" data-cy="explore" className={styles.button} onClick={onClickExplore} >Explore</HCButton>
                    </div>
                  </Col>
                </Row>
              </HCCard>
            </div>
          </Col>
        </Row>
        {props.isSavedQueryUser && <Row className={"g-0"}>
          <Col xs={12} className={"py-3"}>
            <p className={styles.p}>- or -</p>
          </Col>
        </Row>}
        {props.isSavedQueryUser && <Row className={"g-0"}>
          <Col xs={12}>
            <div className={styles.box}>
              <Card className={styles.smallCard}>
                <Row>
                  <Col xs={12} >
                    <div id="query-selector">
                      <Select
                        id="query-select-wrapper"
                        inputId="query-select"
                        placeholder="Select a saved query"
                        onChange={onItemSelect}
                        aria-label="query-select"
                        options={queryOptions}
                        styles={reactSelectThemeConfig}
                        formatOptionLabel={({value, label}) => {
                          return (
                            <span data-cy={`query-option-${value}`}>
                              {label}
                            </span>
                          );
                        }}
                      />
                    </div>
                  </Col>
                </Row>
              </Card>
            </div>
          </Col>
        </Row>}
      </div>
      <div className={styles.footer}>
      </div>
    </div>
  );
};

export default ZeroStateExplorer;