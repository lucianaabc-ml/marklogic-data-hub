import React, {useState, useContext, CSSProperties} from 'react';
import { Accordion, ButtonGroup, Card, Dropdown, Modal } from "react-bootstrap";
import styles from "./flows.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {AuthoritiesContext} from "@util/authorities";
import { PopoverRunSteps, RunToolTips, SecurityTooltips } from "@config/tooltips.config";
import { HCCard, HCTooltip, HCButton, HCCheckbox } from "@components/common";
import { faArrowAltCircleLeft, faArrowAltCircleRight, faTrashAlt } from "@fortawesome/free-regular-svg-icons"; import { ChevronDown, ExclamationCircleFill, GearFill, PlayCircleFill, X, XCircleFill } from "react-bootstrap-icons";
import { faBan, faCheckCircle, faClock, faInfoCircle, faStopCircle } from "@fortawesome/free-solid-svg-icons";
import { ReorderFlowOrderDirection, StepDefinitionTypeTitles } from './types';
import { themeColors } from "@config/themes.config";
import { Link, useLocation } from "react-router-dom";

import {dynamicSortDates} from "@util/conversionFunctions";

import sourceFormatOptions from "@config/formats.config";

interface Props {
  key: string;
  ref: React.RefObject<any>;
  flow: any;
  flows: any;
  flowsDeepCopy: any;
  steps: any;
  selectedSteps: any;
  selectedStepOptions: any;
  runningStep: any;
  isStepRunning: any;
  arrayLoadChecksSteps:any;
  checkAll: any;
  canWriteFlow: boolean;
  canUserStopFlow: boolean;
  hasOperatorRole: boolean;
  getFlowWithJobInfo: any;
  latestJobData: any;
  flowRunning: any;
  uploadError: any;
  showUploadError: any;
  reorderFlow: (id: string, flowName: string, direction: ReorderFlowOrderDirection) => void;
  handleRunSingleStep: any;
  handleRunFlow: any;
  handleFlowDelete: any;
  handleStepAdd: any;
  handleStepDelete: any;
  onCheckboxChange: any;
  stopRun: any;
  setJobId: any;
  openFilePicker: any;
  setRunningStep: any;
  setRunningFlow: any;
  getInputProps: any;
  getRootProps: any;
  setShowUploadError:any;
  setSingleIngest:any;
  setOpenJobResponse: React.Dispatch<React.SetStateAction<boolean>>;
  setNewFlow: any;
  setFlowData: any;
  setTitle: any;
  setActiveKeys: any;
  activeKeys: any;
}

const FlowPanel: React.FC<Props> = ({
  flowsDeepCopy,
  flow,
  flows,
  ref,
  steps,
  key,
  checkAll,
  latestJobData,
  selectedSteps,
  selectedStepOptions,
  openFilePicker,
  setRunningStep,
  setRunningFlow,
  handleStepAdd,
  handleStepDelete,
  handleRunFlow,
  handleFlowDelete,
  handleRunSingleStep,
  stopRun,
  onCheckboxChange,
  uploadError,
  showUploadError,
  isStepRunning,
  runningStep,
  flowRunning,
  hasOperatorRole,
  reorderFlow,
  canWriteFlow,
  canUserStopFlow,
  activeKeys,
  setActiveKeys,
  setJobId,
  getFlowWithJobInfo,
  arrayLoadChecksSteps,
  getInputProps,
  getRootProps,
  setShowUploadError,
  setSingleIngest,
  setOpenJobResponse,
  setNewFlow,
  setFlowData,
  setTitle
}) => {
  const [currentTooltip, setCurrentTooltip] = useState("");
    const [showLinks, setShowLinks] = useState("");

  
  // For role-based privileges
  const authorityService = useContext(AuthoritiesContext);
  const authorityByStepType = {
    ingestion: authorityService.canReadLoad(),
    mapping: authorityService.canReadMapping(),
    matching: authorityService.canReadMatchMerge(),
    merging: authorityService.canReadMatchMerge(),
    custom: authorityService.canReadCustom()
  };
  
  const handleMouseOver = (e, name) => {
    setShowLinks(name);
  };
  
  //Custom CSS for source Format
  const sourceFormatStyle = (sourceFmt) => {
    let customStyles: CSSProperties;
    if (!sourceFmt) {
      customStyles = {
        float: "left",
        backgroundColor: "#fff",
        color: "#fff",
        padding: "5px"
      };
    } else {
      customStyles = {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: "35px",
        width: "35px",
        lineHeight: "35px",
        backgroundColor: sourceFormatOptions[sourceFmt].color,
        fontSize: sourceFmt === "json" ? "12px" : "13px",
        borderRadius: "50%",
        textAlign: "center",
        color: "#ffffff",
        verticalAlign: "middle"
      };
    }
    return customStyles;
  };

  
  let titleTypeStep; let currentTitle = "";
  let mapTypeSteps = new Map([["mapping", "Mapping"], ["merging", "Merging"], ["custom", "Custom"], ["mastering", "Mastering"], ["ingestion", "Loading"]]);
  const handleTitleSteps = (stepType) => {
    if (currentTitle !== stepType) {
      titleTypeStep = mapTypeSteps.get(stepType) ? mapTypeSteps.get(stepType) : "";
    } else { titleTypeStep = ""; }

    currentTitle = stepType;
    return titleTypeStep;
  };

  const isRunning = (flowId, stepId) => {
    let result = flowRunning.steps?.find(r => (flowRunning.name === flowId && r.stepId === stepId));
    return result !== undefined;
  };
  const lastRunResponse = (step, flow) => {
    let stepEndTime;
    if (step.stepEndTime) {
      stepEndTime = new Date(step.stepEndTime).toLocaleString();
    }

    let canceled = latestJobData[flow]?.some(function (stepObj) {
      return stepObj.lastRunStatus?.includes("canceled");
    });

    if (!step.lastRunStatus && !canceled) {
      return null;
    }

    if (isRunning(flow.name, step.stepNumber)) {
      return (
        <HCTooltip text={RunToolTips.stepRunning} id="running-tooltip" placement="bottom">
          <span>
            <i><FontAwesomeIcon aria-label="icon: clock-circle" icon={faClock} className={styles.runningIcon} size="lg" data-testid={`running-${step.stepName}`} /></i>
          </span>
        </HCTooltip>
      );
    } else if (step.lastRunStatus?.includes("canceled") || (!step.lastRunStatus && canceled)) {
      return (
        <span>
          <HCTooltip text={RunToolTips.stepCanceled(stepEndTime)} id="canceled-tooltip" placement="bottom">
            <span>
              <i><FontAwesomeIcon icon={faBan} aria-label="icon: canceled-circle" className={styles.canceledRun} /></i>
            </span>
          </HCTooltip>
        </span>
      );
    } else if (step.lastRunStatus === "completed step " + step.stepNumber) {
      return (
        <span>
          <HCTooltip text={RunToolTips.stepCompleted(stepEndTime)} id="success-tooltip" placement="bottom">
            <span>
              <i><FontAwesomeIcon aria-label="icon: check-circle" icon={faCheckCircle} className={styles.successfulRun} size="lg" data-testid={`check-circle-${step.stepName}`} /></i>
            </span>
          </HCTooltip>
        </span>
      );

    } else if (step.lastRunStatus === "completed with errors step " + step.stepNumber) {
      return (
        <span>
          <HCTooltip text={RunToolTips.stepCompletedWithErrors(stepEndTime)} id="complete-with-errors-tooltip" placement="bottom">
            <ExclamationCircleFill aria-label="icon: exclamation-circle" className={styles.unSuccessfulRun} />
          </HCTooltip>
        </span>
      );
    } else {
      return (
        <span>
          <HCTooltip text={RunToolTips.stepFailed(stepEndTime)} id="step-last-failed-tooltip" placement="bottom">
            <XCircleFill data-icon="failed-circle" aria-label="icon: failed-circle" className={styles.unSuccessfulRun} />
          </HCTooltip>
        </span>
      );
    }
  };

  const isFlowEmpty = (flowName) => {
    return flowsDeepCopy.filter((flow) => flow.name === flowName)[0]?.steps?.length < 1;
  };

  const controlStepSelected = (flowName) => {
    let obj = selectedSteps.find(obj => obj.flowName === flowName);
    const obj2 = Object.keys(selectedStepOptions).find(obj => obj.includes(flowName));
    if (obj && obj2) { return true; } else { return false; }
  };

  const controlDisabled = (step, flowName) => {
    let disabledCheck = false;
    const filteredaArray = arrayLoadChecksSteps && arrayLoadChecksSteps.filter(obj => {
      return obj.flowName === flowName;
    });

    if (filteredaArray.length > 0) {
      const filteredaArrayAux = filteredaArray.filter(obj => {
        return obj.checked === true && obj.stepNumber !== -1;
      });

      if (filteredaArrayAux.length > 0) {
        const elemento = filteredaArrayAux.find(element => element.stepId === flowName + "-" + step?.stepName + "-" + step?.stepDefinitionType.toLowerCase() &&/* step.checked === true&&*/  element.stepNumber !== -1);
        if (elemento) {
          disabledCheck = false;
        } else {
          disabledCheck = true;

        }
      } else { disabledCheck = false; return false; }
    }
    return disabledCheck;
  };

  const countLetters = (stepName) => {
    let letterCount = stepName?.replace(/\s+/g, "").length;
    return letterCount > 35;
  };

  const handlePanelInteraction = (key) => {
    const tmpActiveKeys = [...activeKeys];
    const index = tmpActiveKeys.indexOf(key);
    index !== -1 ? tmpActiveKeys.splice(index, 1) : tmpActiveKeys.push(key);
    /* Request to get latest job info for the flow will be made when someone opens the pane for the first time
        or opens a new pane. Closing the pane shouldn't send any requests*/
    if (!activeKeys || (tmpActiveKeys.length > activeKeys.length && tmpActiveKeys.length > 0)) {
      getFlowWithJobInfo(tmpActiveKeys[tmpActiveKeys.length - 1]);
    }
    setActiveKeys([...tmpActiveKeys]);
  }

  const OpenFlowJobStatus = (e, index, name) => {
    e.stopPropagation();
    e.preventDefault();
    //parse for latest job to display
    let completedJobsWithDates = latestJobData[name].filter(step => step.hasOwnProperty("jobId")).map((step, i) => ({ jobId: step.jobId, date: step.stepEndTime }));
    let sortedJobs = completedJobsWithDates.sort(dynamicSortDates("date"));
    setJobId(sortedJobs[0].jobId);
    setOpenJobResponse(true);
  };

  const OpenEditFlowDialog = (e, index) => {
    e.stopPropagation();
    setTitle("Edit Flow");
    setFlowData(prevState => ({ ...prevState, ...flows[index] }));
    setNewFlow(true);
  };

  const showStopButton = (flowName: string): boolean => {
    if (!flowRunning) return false;
    return (isStepRunning && flowRunning.name === flowName);
  };

  const reorderFlowKeyDownHandler = (event, index, flowName, direction) => {
    if (event.key === "Enter") {
      reorderFlow(index, flowName, direction);
      event.preventDefault();
    }
  };

  let cards = flow.steps.map((step, index) => {
    let sourceFormat = step.sourceFormat;
    let stepNumber = step.stepNumber;
    let viewStepId = `${flow.name}-${stepNumber}`;
    let stepDefinitionType = step.stepDefinitionType ? step.stepDefinitionType.toLowerCase() : "";
    let stepDefinitionTypeTitle = StepDefinitionTypeTitles[stepDefinitionType];
    let stepWithJobDetail = latestJobData && latestJobData[flow.name] && latestJobData[flow.name] ? latestJobData[flow.name].find(el => el.stepId === step.stepId) : null;
    return (
      <div key={viewStepId} id="flowSettings">
        <HCCard
          className={styles.cardStyle}
          title={StepDefinitionTypeTitles[step.stepDefinitionType] || "Unknown"}
          actions={[
            <div className={styles.reorder}>
              {index !== 0 && canWriteFlow &&
                <div className={styles.reorderLeft}>
                  <HCTooltip text={RunToolTips.moveLeft} id="move-left-tooltip" placement="bottom">
                    <i>
                      <FontAwesomeIcon
                        aria-label={`leftArrow-${step.stepName}`}
                        icon={faArrowAltCircleLeft}
                        className={styles.reorderFlowLeft}
                        role="button"
                        onClick={() => reorderFlow(index, flow.name, ReorderFlowOrderDirection.LEFT)}
                        onKeyDown={(e) => reorderFlowKeyDownHandler(e, index, flow.name, ReorderFlowOrderDirection.LEFT)}
                        tabIndex={0} />
                    </i>
                  </HCTooltip>
                </div>
              }
              <div className={styles.reorderRight}>
                <div className={styles.stepResponse}>
                  {stepWithJobDetail ? lastRunResponse(stepWithJobDetail, flow.name) : ""}
                </div>
                {index < flow.steps.length - 1 && canWriteFlow &&
                  <HCTooltip aria-label="icon: right" text="Move right" id="move-right-tooltip" placement="bottom" >
                    <i>
                      <FontAwesomeIcon
                        aria-label={`rightArrow-${step.stepName}`}
                        icon={faArrowAltCircleRight}
                        className={styles.reorderFlowRight}
                        role="button"
                        onClick={() => reorderFlow(index, flow.name, ReorderFlowOrderDirection.RIGHT)}
                        onKeyDown={(e) => reorderFlowKeyDownHandler(e, index, flow.name, ReorderFlowOrderDirection.RIGHT)}
                        tabIndex={0} />
                    </i>
                  </HCTooltip>
                }
              </div>
            </div>
          ]}
          titleExtra={
            <div className={styles.actions}>
              {hasOperatorRole ?
                step.stepDefinitionType.toLowerCase() === "ingestion" ?
                  <div {...getRootProps()} style={{ display: "inline-block" }}>
                    <input {...getInputProps()} id="fileUpload" />
                    <div
                      className={styles.run}
                      aria-label={`runStep-${step.stepName}`}
                      data-testid={"runStep-" + stepNumber}
                      onClick={() => {
                        setShowUploadError(false);
                        setSingleIngest(true);
                        setRunningStep(step);
                        setRunningFlow(flow.name);
                        openFilePicker();
                      }}
                    >
                      <HCTooltip text={RunToolTips.ingestionStep} id="run-ingestion-tooltip" placement="bottom">
                        <PlayCircleFill aria-label="icon: play-circle" color={themeColors.defaults.questionCircle} size={20} />
                      </HCTooltip>
                    </div>
                  </div>
                  :
                  <div
                    className={styles.run}
                    onClick={() => {
                      handleRunSingleStep(flow.name, step);
                    }}
                    aria-label={`runStep-${step.stepName}`}
                    data-testid={"runStep-" + stepNumber}
                  >
                    <HCTooltip text={RunToolTips.otherSteps} id="run-tooltip" placement="bottom">
                      <PlayCircleFill aria-label="icon: play-circle" color={themeColors.defaults.questionCircle} size={20} />
                    </HCTooltip>
                  </div>
                :
                <div
                  className={styles.disabledRun}
                  onClick={(event) => { event.stopPropagation(); event.preventDefault(); }}
                  aria-label={"runStepDisabled-" + step.stepName}
                  data-testid={"runStepDisabled-" + stepNumber}
                >
                  <PlayCircleFill size={20} />
                </div>
              }
              {canWriteFlow ?
                <HCTooltip text={RunToolTips.removeStep} id="delete-step-tooltip" placement="bottom">
                  <div className={styles.delete} aria-label={`deleteStep-${step.stepName}`} onClick={() => handleStepDelete(flow.name, step)}>
                    <X aria-label="icon: close" color={themeColors.primary} size={27} />
                  </div>
                </HCTooltip> :
                <HCTooltip text={RunToolTips.removeStep} id="delete-step-tooltip" placement="bottom">
                  <div className={styles.disabledDelete} aria-label={`deleteStepDisabled-${step.stepName}`} onClick={(event) => { event.stopPropagation(); event.preventDefault(); }}>
                    <X aria-label="icon: close" color={themeColors.primary} size={27} />
                  </div>
                </HCTooltip>
              }
            </div>
          }
          footerClassName={styles.cardFooter}
        >
          <div aria-label={viewStepId + "-content"} className={styles.cardContent}
            onMouseOver={(e) => handleMouseOver(e, viewStepId)}
            onMouseLeave={(e) => setShowLinks("")} >
            {sourceFormat ?
              <div className={styles.format} style={sourceFormatStyle(sourceFormat)} >{sourceFormatOptions[sourceFormat].label}</div>
              : null}
            <div className={sourceFormat ? styles.loadStepName : styles.name}>{step.stepName}</div>
            <div className={styles.cardLinks}
              style={{ display: showLinks === viewStepId && step.stepId && authorityByStepType[stepDefinitionType] ? "block" : "none" }}
              aria-label={viewStepId + "-cardlink"}
            >
              <Link id={"tiles-step-view-" + viewStepId}
                to={{
                  pathname: `/tiles/${stepDefinitionType.toLowerCase() === "ingestion" ? "load" : "curate"}`,
                  state: {
                    stepToView: step.stepId,
                    stepDefinitionType: stepDefinitionType,
                    targetEntityType: step.targetEntityType
                  }
                }}
              >
                <div className={styles.cardLink} data-testid={`${viewStepId}-viewStep`}>View {stepDefinitionTypeTitle} steps</div>
              </Link>
            </div>
          </div>
          <div className={styles.uploadError}>
            {showUploadError && flow.name === flowRunning.name && stepNumber === runningStep.stepNumber ? uploadError : ""}
          </div>
        </HCCard>
      </div>
    );
  });

  const flowMenu = (flowName) => {
    return (
      <>
        <Dropdown.Header className="py-0 fs-6 mb-2 text-dark">{PopoverRunSteps.selectStepTitle}</Dropdown.Header>
        <hr />
        <div className={styles.divCheckAll}>
          <HCCheckbox
            id={"checkAll"}
            value={checkAll[flowName]}
            checked={checkAll[flowName]}
            dataTestId={"select-all-toggle"}
            handleClick={(event) => onCheckboxChange(event, "", "", "", flowName, "", "", true)}
            label={checkAll[flowName] ? "Deselect All" : "Select All"}
          >
          </HCCheckbox>
        </div>
        {flowsDeepCopy.filter((flow) => flow.name === flowName)[0]?.steps?.sort((a, b) => a.stepDefinitionType?.toLowerCase()?.localeCompare(b.stepDefinitionType?.toLowerCase())).map((step, index) => {
          return (
            <div key={index}>
              <div className={styles.titleTypeStep}>{handleTitleSteps(step?.stepDefinitionType?.toLowerCase())}</div>
              <div key={index} className={styles.divItem}>
                <HCTooltip text={step.stepDefinitionType.toLowerCase() === "ingestion" ? controlDisabled(step, flowName) ? RunToolTips.loadStepRunFlow : "" : ""} placement="left" id={`tooltip`}>
                  <div className="divCheckBoxStep">
                    <HCCheckbox
                      tooltip={step.stepName}
                      placementTooltip={"top"}
                      label={countLetters(step.stepName) ? step.stepName : undefined}
                      id={step.stepName}
                      value={step.stepName}
                      handleClick={(event) => onCheckboxChange(event, step.stepName, step.stepNumber, step.stepDefinitionType, flowName, step.stepId, step.sourceFormat)}
                      checked={!!selectedStepOptions[flowName + "-" + step.stepName + "-" + step.stepDefinitionType.toLowerCase()]}
                      disabled={step.stepDefinitionType.toLowerCase() === "ingestion" ? controlDisabled(step, flowName) : false}
                      removeMargin={true}
                    >{step.stepName}
                    </HCCheckbox></div></HCTooltip>
              </div>
            </div>
          );
        })}
        <Dropdown.Header className="py-0 fs-6 mt-2 text-danger" style={{whiteSpace: "pre-line"}} id="errorMessageEmptySteps">{controlStepSelected(flowName) ? "" : PopoverRunSteps.selectOneStepError}</Dropdown.Header>
      </>
    );
  };

  const stepMenu = (flowName, i) => (
    <Dropdown align="end" >
      <Dropdown.Toggle data-testid={`addStep-${flowName}`} aria-label={`addStep-${flowName}`} disabled={!canWriteFlow} variant="outline-light" className={canWriteFlow ? styles.stepMenu : styles.stepMenuDisabled}>
        {
          canWriteFlow ?
            <>Add Step<ChevronDown className="ms-2" /> </>
            :
            <HCTooltip text={SecurityTooltips.missingPermission} id="add-step-disabled-tooltip" placement="bottom">
              <span aria-label={"addStepDisabled-" + i}>Add Step<ChevronDown className="ms-2" /> </span>
            </HCTooltip>
        }
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Header className="py-0 px-2 fs-6">Loading</Dropdown.Header>
        {steps && steps["ingestionSteps"] && steps["ingestionSteps"].length > 0 ? steps["ingestionSteps"].map((elem, index) => (
          <Dropdown.Item key={index} aria-label={`${elem.name}-to-flow`}>
            <div
              onClick={() => { handleStepAdd(elem.name, flowName, "ingestion"); }}
            >{elem.name}</div>
          </Dropdown.Item>
        )) : null}

        <Dropdown.Header className="py-0 px-2 fs-6">Mapping</Dropdown.Header>
        {steps && steps["mappingSteps"] && steps["mappingSteps"].length > 0 ? steps["mappingSteps"].map((elem, index) => (
          <Dropdown.Item key={index} aria-label={`${elem.name}-to-flow`}>
            <div
              onClick={() => { handleStepAdd(elem.name, flowName, "mapping"); }}
            >{elem.name}</div>
          </Dropdown.Item>
        )) : null}

        <Dropdown.Header className="py-0 px-2 fs-6">Matching</Dropdown.Header>
        {steps && steps["matchingSteps"] && steps["matchingSteps"].length > 0 ? steps["matchingSteps"].map((elem, index) => (
          <Dropdown.Item key={index} aria-label={`${elem.name}-to-flow`}>
            <div
              onClick={() => { handleStepAdd(elem.name, flowName, "matching"); }}
            >{elem.name}</div>
          </Dropdown.Item>
        )) : null}

        <Dropdown.Header className="py-0 px-2 fs-6">Merging</Dropdown.Header>
        {steps && steps["mergingSteps"] && steps["mergingSteps"].length > 0 ? steps["mergingSteps"].map((elem, index) => (
          <Dropdown.Item key={index} aria-label={`${elem.name}-to-flow`}>
            <div
              onClick={() => { handleStepAdd(elem.name, flowName, "merging"); }}
            >{elem.name}</div>
          </Dropdown.Item>
        )) : null}

        <Dropdown.Header className="py-0 px-2 fs-6">Mastering</Dropdown.Header>
        {steps && steps["masteringSteps"] && steps["masteringSteps"].length > 0 ? steps["masteringSteps"].map((elem, index) => (
          <Dropdown.Item key={index} aria-label={`${elem.name}-to-flow`}>
            <div
              onClick={() => { handleStepAdd(elem.name, flowName, "mastering"); }}
            >{elem.name}</div>
          </Dropdown.Item>
        )) : null}

        <Dropdown.Header className="py-0 px-2 fs-6">Custom</Dropdown.Header>
        {steps && steps["customSteps"] && steps["customSteps"].length > 0 ? steps["customSteps"].map((elem, index) => (
          <Dropdown.Item key={index} aria-label={`${elem.name}-to-flow`}>
            <div
              onClick={() => { handleStepAdd(elem.name, flowName, "custom"); }}
            >{elem.name}</div>
          </Dropdown.Item>
        )) : null}
      </Dropdown.Menu>
    </Dropdown>
  );

  const panelActions = (name, i) => (
    <div
      className={styles.panelActionsContainer}
      id="panelActions"
      onClick={event => {
        event.stopPropagation(); // Do not trigger collapse
        event.preventDefault();
      }}
    >
      {showStopButton(name) && (<HCTooltip text={canUserStopFlow ? RunToolTips.stopRun : RunToolTips.stopRunMissingPermission} id="stop-run" placement="top">
        <span>
          <HCButton
            variant="outline-light"
            className={styles.stopFlow}
            key={`stepsDropdownButton-${name}`}
            data-testid={`stopFlow-${name}`}
            id={`stopFlow-${name}`}
            size="sm"
            onClick={() => { stopRun(); }}
            disabled={!canUserStopFlow}
          >
            <FontAwesomeIcon icon={faStopCircle} size="1x" aria-label="icon: info-circle" className={canUserStopFlow ? styles.stopIcon : styles.stopIconDisabled} />
            Stop Flow
          </HCButton>
        </span>
      </HCTooltip>)}
      <span id="stepsDropdown" className={styles.hoverColor} onMouseLeave={(e) => { setCurrentTooltip(""); }}>
        <Dropdown as={ButtonGroup}>
          <HCTooltip show={currentTooltip === name} text={isFlowEmpty(name) ? RunToolTips.runEmptyFlow : !controlStepSelected(name) ? RunToolTips.selectAStep : ""} placement="top" id={`run-flow-tooltip`}>
            <span onMouseEnter={(e) => { !controlStepSelected(name) || isFlowEmpty(name) ? setCurrentTooltip(name) : void 0; }} onMouseLeave={(e) => { !isFlowEmpty(name) ? setCurrentTooltip("") : void 0; }} id={`${name}`}>
              <HCButton
                variant="transparent"
                className={styles.runFlow}
                key={`stepsDropdownButton-${name}`}
                data-testid={`runFlow-${name}`}
                id={`runFlow-${name}`}
                size="sm"
                onClick={() => handleRunFlow(i, name)}
                disabled={!controlStepSelected(name) || flowsDeepCopy.filter((flow) => flow.name === name)[0]?.steps?.length < 1}
              >
                <><PlayCircleFill className={styles.runIcon} /> Run Flow </>
              </HCButton>
            </span>
          </HCTooltip>
          <Dropdown.Toggle split variant="transparent" className={styles.runIconToggle} disabled={isFlowEmpty(name) ? true : false}>
            <GearFill className={styles.runIcon} role="step-settings button" aria-label={`stepSettings-${name}`} />
          </Dropdown.Toggle>
          <Dropdown.Menu className={styles.dropdownMenu}>
            {flowMenu(name)}
          </Dropdown.Menu>
        </Dropdown>
      </span>
      {stepMenu(name, i)}
      <span className={styles.deleteFlow}>
        {canWriteFlow ?
          <HCTooltip text="Delete Flow" id="disabled-trash-tooltip" placement="bottom">
            <i aria-label={`deleteFlow-${name}`} className={"d-flex align-items-center"}>
              <FontAwesomeIcon
                icon={faTrashAlt}
                onClick={() => { handleFlowDelete(name); }}
                data-testid={`deleteFlow-${name}`}
                className={styles.deleteIcon}
                size="lg" />
            </i>
          </HCTooltip>
          :
          <HCTooltip text={"Delete Flow: " + SecurityTooltips.missingPermission} id="trash-tooltip" placement="bottom">
            <i aria-label={`deleteFlowDisabled-${name}`} className={"d-flex align-items-center"}>
              <FontAwesomeIcon
                icon={faTrashAlt}
                data-testid={`deleteFlow-${name}`}
                className={styles.disabledDeleteIcon}
                size="lg" />
            </i>
          </HCTooltip>}
      </span>
    </div>
  );

  return (
    <Accordion className={"w-100"} flush key={key} id={flow.name} activeKey={activeKeys.includes(key) ? key : ""} defaultActiveKey={activeKeys.includes(key) ? key : ""}>
      <Accordion.Item eventKey={key}>
        <Card>
          <Card.Header className={"p-0 pe-3 d-flex bg-white"}>
            <Accordion.Button data-testid={`accordion-${flow.name}`} onClick={() => handlePanelInteraction(key)}>
              <span id={"flow-header-" + flow.name} className={styles.flowHeader}>
                <HCTooltip text={canWriteFlow ? RunToolTips.flowEdit : RunToolTips.flowDetails} id="open-edit-tooltip" placement="bottom">
                  <span className={styles.flowName} onClick={(e) => OpenEditFlowDialog(e, key)}>
                    {flow.name}
                  </span>
                </HCTooltip>
                {latestJobData && latestJobData[flow.name] && latestJobData[flow.name].find(step => step.jobId) ?
                  <HCTooltip text={RunToolTips.flowName} placement="bottom" id="">
                    <span onClick={(e) => OpenFlowJobStatus(e, key, flow.name)} className={styles.infoIcon} data-testid={`${flow.name}-flow-status`}>
                      <FontAwesomeIcon icon={faInfoCircle} size="1x" aria-label="icon: info-circle" className={styles.flowStatusIcon} />
                    </span>
                  </HCTooltip>
                  : ""
                }
              </span>
            </Accordion.Button>
            {panelActions(flow.name, key)}
          </Card.Header>
          <Accordion.Body className={styles.panelContent} ref={ref}>
            {cards}
          </Accordion.Body>
        </Card>
      </Accordion.Item>
    </Accordion>
  );
}


export default FlowPanel;