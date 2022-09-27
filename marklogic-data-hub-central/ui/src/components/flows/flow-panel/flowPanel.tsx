import React, {useState} from "react";
import {Accordion, ButtonGroup, Card, Dropdown} from "react-bootstrap";
import styles from "../flows.module.scss";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {PopoverRunSteps, RunToolTips, SecurityTooltips} from "@config/tooltips.config";
import {HCTooltip, HCButton, HCCheckbox} from "@components/common";
import {faTrashAlt} from "@fortawesome/free-regular-svg-icons";
import {ChevronDown, ExclamationCircleFill, GearFill, PlayCircleFill, XCircleFill} from "react-bootstrap-icons";
import {faBan, faCheckCircle, faClock, faInfoCircle, faStopCircle} from "@fortawesome/free-solid-svg-icons";
import {ReorderFlowOrderDirection} from "../types";
import FlowCard from "./flowCard";
import {Flow, Step} from "../../../types/run-types";

import {dynamicSortDates} from "@util/conversionFunctions";

import sourceFormatOptions from "@config/formats.config";

interface Props {
  idx: string;
  flowRef: React.RefObject<any>;
  flow: Flow;
  flowRunning: Flow;
  flows: Flow[];
  flowsDeepCopy: any;
  steps: Step[];
  selectedSteps: Step[];
  selectedStepOptions: any;
  runningStep: Step;
  isStepRunning: boolean;
  arrayLoadChecksSteps:any;
  checkAll: any;
  canWriteFlow: boolean;
  canUserStopFlow: boolean;
  hasOperatorRole: boolean;
  getFlowWithJobInfo: (flowNum)=>Promise<void>;
  latestJobData: any;
  uploadError: string;
  showUploadError: any;
  reorderFlow: (id: string, flowName: string, direction: ReorderFlowOrderDirection) => void;
  handleRunSingleStep: (flowName: string, step: any) => Promise<void>;
  handleRunFlow: (index: number, name: string) => Promise<void>;
  handleFlowDelete: (name: string) =>void;
  handleStepAdd: (stepName:string, flowName: string, stepType:string)=>Promise<void>;
  handleStepDelete: (flowName: string, stepDetails: any)=> void;
  onCheckboxChange: (event, checkedValues?, stepNumber?, stepDefinitionType?, flowNames?, stepId?, sourceFormat?, fromCheckAll?)=>void;
  stopRun: () => Promise<void>;
  openFilePicker: ()=>void;
  setJobId: React.Dispatch<React.SetStateAction<string>>;
  setRunningStep: React.Dispatch<any>;
  setRunningFlow: React.Dispatch<any>;
  getInputProps: any;
  getRootProps: any;
  setShowUploadError:React.Dispatch<React.SetStateAction<boolean>>;
  setSingleIngest:React.Dispatch<React.SetStateAction<boolean>>;
  setOpenJobResponse: React.Dispatch<React.SetStateAction<boolean>>;
  setNewFlow: React.Dispatch<React.SetStateAction<boolean>>;
  setFlowData: React.Dispatch<React.SetStateAction<{}>>;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  setActiveKeys: React.Dispatch<any>;
  activeKeys: any;
}

const FlowPanel: React.FC<Props> = ({
  flowsDeepCopy,
  flow,
  flows,
  flowRef,
  steps,
  idx,
  checkAll,
  latestJobData,
  selectedSteps,
  selectedStepOptions,
  openFilePicker,
  setRunningStep,
  setRunningFlow,
  handleStepDelete,
  handleRunSingleStep,
  runningStep,
  hasOperatorRole,
  getInputProps,
  getRootProps,
  setShowUploadError,
  setSingleIngest,
  uploadError,
  showUploadError,
  handleStepAdd,
  handleRunFlow,
  handleFlowDelete,
  stopRun,
  onCheckboxChange,
  isStepRunning,
  flowRunning,
  reorderFlow,
  canWriteFlow,
  canUserStopFlow,
  activeKeys,
  setActiveKeys,
  setJobId,
  getFlowWithJobInfo,
  arrayLoadChecksSteps,
  setOpenJobResponse,
  setNewFlow,
  setFlowData,
  setTitle
}) => {
  const [currentTooltip, setCurrentTooltip] = useState("");
  const [showLinks, setShowLinks] = useState("");

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
  };

  const OpenFlowJobStatus = (e, index, name) => {
    e.stopPropagation();
    e.preventDefault();
    //parse for latest job to display
    let completedJobsWithDates = latestJobData[name].filter(step => step.hasOwnProperty("jobId")).map((step, i) => ({jobId: step.jobId, date: step.stepEndTime}));
    let sortedJobs = completedJobsWithDates.sort(dynamicSortDates("date"));
    setJobId(sortedJobs[0].jobId);
    setOpenJobResponse(true);
  };

  const OpenEditFlowDialog = (e, index) => {
    e.stopPropagation();
    setTitle("Edit Flow");
    setFlowData(prevState => ({...prevState, ...flows[index]}));
    setNewFlow(true);
  };

  const showStopButton = (flowName: string): boolean => {
    if (!flowRunning) return false;
    return (isStepRunning && flowRunning.name === flowName);
  };

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
    <Accordion className={"w-100"} flush key={idx} id={flow.name} activeKey={activeKeys.includes(idx) ? idx : ""} defaultActiveKey={activeKeys.includes(idx) ? idx : ""}>
      <Accordion.Item eventKey={idx}>
        <Card>
          <Card.Header className={"p-0 pe-3 d-flex bg-white"}>
            <Accordion.Button data-testid={`accordion-${flow.name}`} onClick={() => handlePanelInteraction(idx)}>
              <span id={"flow-header-" + flow.name} className={styles.flowHeader}>
                <HCTooltip text={canWriteFlow ? RunToolTips.flowEdit : RunToolTips.flowDetails} id="open-edit-tooltip" placement="bottom">
                  <span className={styles.flowName} onClick={(e) => OpenEditFlowDialog(e, idx)}>
                    {flow.name}
                  </span>
                </HCTooltip>
                {latestJobData && latestJobData[flow.name] && latestJobData[flow.name].find(step => step.jobId) ?
                  <HCTooltip text={RunToolTips.flowName} placement="bottom" id="">
                    <span onClick={(e) => OpenFlowJobStatus(e, idx, flow.name)} className={styles.infoIcon} data-testid={`${flow.name}-flow-status`}>
                      <FontAwesomeIcon icon={faInfoCircle} size="1x" aria-label="icon: info-circle" className={styles.flowStatusIcon} />
                    </span>
                  </HCTooltip>
                  : ""
                }
              </span>
            </Accordion.Button>
            {panelActions(flow.name, idx)}
          </Card.Header>
          <Accordion.Body className={styles.panelContent} ref={flowRef}>
            {flow.steps !== undefined && flow.steps?.map((step, i) => {
              return <FlowCard
                key={i}
                index={i}
                step={step}
                flow={flow}
                openFilePicker={openFilePicker}
                setRunningStep={setRunningStep}
                setRunningFlow={setRunningFlow}
                handleStepDelete={handleStepDelete}
                handleRunSingleStep={handleRunSingleStep}
                latestJobData={latestJobData}
                lastRunResponse={lastRunResponse}
                reorderFlow={reorderFlow}
                canWriteFlow={canWriteFlow}
                hasOperatorRole={hasOperatorRole}
                getRootProps={getRootProps}
                getInputProps={getInputProps}
                setSingleIngest={setSingleIngest}
                showLinks={showLinks}
                setShowLinks={setShowLinks}
                setShowUploadError={setShowUploadError}
                sourceFormatOptions={sourceFormatOptions}
                runningStep={runningStep}
                flowRunning={flowRunning}
                showUploadError={showUploadError}
                uploadError={uploadError}
              />;
            })}
          </Accordion.Body>
        </Card>
      </Accordion.Item>
    </Accordion>
  );
};


export default FlowPanel;