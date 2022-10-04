import "./flows.scss";

import {HCButton, HCTooltip} from "@components/common";
import {useLocation} from "react-router-dom";
import {SecurityTooltips} from "@config/tooltips.config";
import React, {createRef, useEffect, useState} from "react";
import {getViewSettings} from "@util/user-context";
// import {getUserPreferences, updateUserPreferences} from "../../../src/services//user-preferences";
import {Flow} from "../../types/run-types";
import NewFlowDialog from "./new-flow-dialog/new-flow-dialog";
import axios from "axios";
import styles from "./flows.module.scss";
import {useDropzone} from "react-dropzone";
import {deleteConfirmationModal, deleteStepConfirmationModal, addStepConfirmationModal, addExistingStepConfirmationModal} from "./confirmation-modals";
import FlowPanel from "./flow-panel/flowPanel";
import {ReorderFlowOrderDirection, SelectedSteps} from "./types";
export interface Props {
  flows: Flow[];
  steps: any;
  deleteFlow: any;
  createFlow: any;
  updateFlow: (name: any, description: any, steps: any) => Promise<void>;
  deleteStep: any;
  runStep: any;
  stopRun: () => Promise<void>;
  runFlowSteps: any;
  canReadFlow: boolean;
  canWriteFlow: boolean;
  hasOperatorRole: boolean;
  flowRunning: Flow;
  uploadError: string;
  newStepToFlowOptions: any;
  addStepToFlow: any;
  flowsDefaultActiveKey: any;
  runEnded: any;
  onReorderFlow: (flowIndex: number, newSteps: Array<any>) => void
  setJobId: any;
  setOpenJobResponse: React.Dispatch<React.SetStateAction<boolean>>;
  isStepRunning: boolean;
  canUserStopFlow: boolean;
}

const Flows: React.FC<Props> = ({
  flows,
  steps,
  deleteFlow,
  createFlow,
  updateFlow,
  deleteStep,
  stopRun,
  runStep,
  runFlowSteps,
  canReadFlow,
  canWriteFlow,
  hasOperatorRole,
  flowRunning,
  uploadError,
  newStepToFlowOptions,
  addStepToFlow,
  flowsDefaultActiveKey,
  runEnded,
  onReorderFlow,
  setJobId,
  setOpenJobResponse,
  isStepRunning,
  canUserStopFlow,
}) => {
  // Setup for file upload
  const {getRootProps, getInputProps, open, acceptedFiles} = useDropzone({
    noClick: true,
    noKeyboard: true
  });
  const storage = getViewSettings();
  const openFlows = storage?.run?.openFlows;
  const hasDefaultKey = JSON.stringify(newStepToFlowOptions?.flowsDefaultKey) !== JSON.stringify(["-1"]);
  const [newFlow, setNewFlow] = useState(false);
  const [addedFlowName, setAddedFlowName] = useState("");
  const [title, setTitle] = useState("");
  const [flowData, setFlowData] = useState({});
  const [dialogVisible, setDialogVisible] = useState(false);
  const [stepDialogVisible, setStepDialogVisible] = useState(false);
  const [addStepDialogVisible, setAddStepDialogVisible] = useState(false);
  const [addExistingStepDialogVisible, setAddExistingStepDialogVisible] = useState(false);
  const [flowName, setFlowName] = useState("");
  const [stepName, setStepName] = useState("");
  const [stepType, setStepType] = useState("");
  const [stepNumber, setStepNumber] = useState("");
  const [runningStep, setRunningStep] = useState<any>({});
  const [runningFlow, setRunningFlow] = useState<any>("");
  const [fileList, setFileList] = useState<any[]>([]);
  const [showUploadError, setShowUploadError] = useState(false);
  const [openNewFlow, setOpenNewFlow] = useState(newStepToFlowOptions?.addingStepToFlow && !newStepToFlowOptions?.existingFlow);
  const [activeKeys, setActiveKeys] = useState(
    hasDefaultKey && (newStepToFlowOptions?.flowsDefaultKey ?? []).length > 0 ?
      newStepToFlowOptions?.flowsDefaultKey :
      (openFlows ? openFlows : [])
  );
  const [startRun, setStartRun] = useState(false);
  const [latestJobData, setLatestJobData] = useState<any>({});
  const [singleIngest, setSingleIngest] = useState(false);
  const [createAdd, setCreateAdd] = useState(true);
  const [addFlowDirty, setAddFlowDirty] = useState({});
  const [addExternalFlowDirty, setExternalAddFlowDirty] = useState(true);
  const [hasQueriedInitialJobData, setHasQueriedInitialJobData] = useState(false);
  const location = useLocation();

  const [allSelectedSteps, setAllSelectedSteps] = useState<SelectedSteps>({});
  // maintain a list of panel refs
  const flowPanelsRef: any = flows.reduce((p, n) => ({...p, ...{[n.name]: createRef()}}), {});

  /* // Persists active keys in session storage as a user interacts with them
    useEffect(() => {
      if (activeKeys === undefined) {
        return;
      }
      const newStorage = {...storage, run: {...storage.run, openFlows: activeKeys}};
      setViewSettings(newStorage);
    }, [activeKeys]);
  */

  // If a step was just added scroll the flow step panel fully to the right
  useEffect(() => {
    const scrollToEnd = f => {
      const panel = flowPanelsRef[f];
      if (panel && panel.current) {
        const {scrollWidth} = panel.current;
        panel.current.scrollIntoView();
        panel.current.scrollTo(scrollWidth * 2, 0);
      }
    };
    if (!flows.length) return;
    const currentFlow = flows.filter(({name}) => name === flowName).shift();
    if (!currentFlow?.steps) return;
    if (currentFlow?.steps?.length > addFlowDirty[flowName]) {
      // Scrolling should happen on the last update after the number of steps in the flow has been updated
      scrollToEnd(flowName);
      setAddFlowDirty({...addFlowDirty, [flowName]: currentFlow?.steps?.length});
    } else {
      // if step is added from external view
      let state: any = location.state || {};
      const externalDirty = (state ? state["addFlowDirty"] : false) && addExternalFlowDirty;
      const thisFlow = state ? state["flowName"] : null;
      if (externalDirty) {
        scrollToEnd(thisFlow);
        setExternalAddFlowDirty(false);
      }
    }
  }, [flows]);

  useEffect(() => {
    if (openFlows === undefined || flows.length === 0 || hasQueriedInitialJobData) {
      return;
    }
    // Endpoint que devuelva el estado de todos los flows en vez de hacer uno por uno
    flows.forEach((flow, i) => {
      getFlowWithJobInfo(i);
    });

    setHasQueriedInitialJobData(true);
  }, [flows]);

  useEffect(() => {
    if (JSON.stringify(flowsDefaultActiveKey) !== JSON.stringify([]) && flowsDefaultActiveKey.length >= activeKeys.length) {
      setActiveKeys([...flowsDefaultActiveKey]);
    }

    if (flows) {
      // Get the latest job info when a step is added to an existing flow from Curate or Load Tile
      if (JSON.stringify(flows) !== JSON.stringify([])) {
        let stepsInFlow = flows[newStepToFlowOptions?.flowsDefaultKey]?.steps;
        if (stepsInFlow === undefined) return;
        if (newStepToFlowOptions && newStepToFlowOptions.addingStepToFlow && newStepToFlowOptions.existingFlow && newStepToFlowOptions.flowsDefaultKey && newStepToFlowOptions.flowsDefaultKey !== -1) {
          getFlowWithJobInfo(newStepToFlowOptions.flowsDefaultKey);
          if (startRun) {
            //run step after step is added to an existing flow
            if (newStepToFlowOptions.stepDefinitionType.toLowerCase() === "ingestion") {
              setShowUploadError(false);
              setRunningStep(stepsInFlow[stepsInFlow.length - 1]);
              setRunningFlow(newStepToFlowOptions?.flowName);
              setSingleIngest(true);
              openFilePicker();
              setStartRun(false);
            } else {
              runStep(newStepToFlowOptions?.flowName, stepsInFlow[stepsInFlow.length - 1]);
              setStartRun(false);
            }
          }
          //run step that is already inside a flow
        } else if (newStepToFlowOptions && !newStepToFlowOptions.addingStepToFlow && newStepToFlowOptions.startRunStep && newStepToFlowOptions.flowsDefaultKey && newStepToFlowOptions.flowsDefaultKey !== -1) {
          let runStepNum = stepsInFlow.findIndex(s => s.stepName === newStepToFlowOptions?.newStepName);
          if (startRun) {
            if (newStepToFlowOptions.stepDefinitionType.toLowerCase() === "ingestion") {
              setShowUploadError(false);
              setRunningStep(stepsInFlow[runStepNum]);
              setRunningFlow(newStepToFlowOptions?.flowName);
              setSingleIngest(true);
              openFilePicker();
              setStartRun(false);
            } else {
              runStep(newStepToFlowOptions?.flowName, stepsInFlow[runStepNum]);
              setStartRun(false);
            }
          }
        }
      }
    }
    if (activeKeys === undefined) {
      setActiveKeys([]);
    }
  }, [flows]);

  useEffect(() => {
    //run step after step is added to a new flow
    if (newStepToFlowOptions && !newStepToFlowOptions.existingFlow && startRun && addedFlowName) {
      let indexFlow = flows?.findIndex(i => i.name === addedFlowName);
      const _steps =flows[indexFlow].steps;
      if (_steps===undefined) return;

      if (_steps.length > 0) {
        let indexStep = _steps.findIndex(s => s.stepName === newStepToFlowOptions.newStepName);
        if (_steps[indexStep].stepDefinitionType.toLowerCase() === "ingestion") {
          setShowUploadError(false);
          setRunningStep(_steps[indexStep]);
          setSingleIngest(true);
          setRunningFlow(addedFlowName);
          openFilePicker();
        } else {
          runStep(addedFlowName, _steps[indexStep]);
          setAddedFlowName("");
          setStartRun(false);
        }
      }
    }
  }, [steps]);

  // Get the latest job info after a step (in a flow) run
  useEffect(() => {
    let num = flows.findIndex((flow) => flow.name === runEnded.flowId);
    if (num >= 0) {
      getFlowWithJobInfo(num);
    }
  }, [runEnded]);

  useEffect(() => {
    if (newStepToFlowOptions && newStepToFlowOptions.startRunStep) {
      setStartRun(true);
    }
  }, [newStepToFlowOptions]);
/* 
  useEffect(() => {
    //When Refreshing or leaving the page, save the flag to get the local storage
    return () => {
      //saveLocalStoragePreferences(true);
    };
  }, []);
 */
  useEffect(() => {
    acceptedFiles.forEach(file => {
      setFileList(prevState => [...prevState, file]);
    });
    if (startRun) {
      setAddedFlowName("");
      setStartRun(false);
    }
  }, [acceptedFiles]);

  useEffect(() => {
    uploadFiles();
  }, [fileList]);

  const OpenAddNewDialog = () => {
    setCreateAdd(false);
    setTitle("New Flow");
    setNewFlow(true);
  };

  const handleStepAdd = async (stepName: string, flowName: string, stepType: string) => {
    if (isStepInFlow(stepName, flowName)) {
      setAddExistingStepDialogVisible(true);
    } else {
      setAddStepDialogVisible(true);
    }
    setFlowName(flowName);
    setStepName(stepName);
    setStepType(stepType);
  };

  const handleFlowDelete = (name) => {
    setDialogVisible(true);
    setFlowName(name);
  };

  const handleStepDelete = (flowName, stepDetails) => {
    setStepDialogVisible(true);
    setFlowName(flowName);
    setStepName(stepDetails.stepName);
    setStepType(stepDetails.stepDefinitionType);
    setStepNumber(stepDetails.stepNumber);
  };

  const onDeleteFlowOk = (name) => {
    deleteFlow(name);
    setDialogVisible(false);
  };

  const onStepOk = (flowName, stepNumber) => {
    setStepDialogVisible(false);
    //saveLocalStoragePreferences(true, true);
    deleteStep(flowName, stepNumber);
  };

  const onConfirmOk = () => {
    setAddExistingStepDialogVisible(false);
  };

  const onAddStepOk = async (stepName, flowName, stepType) => {
    await addStepToFlow(stepName, flowName, stepType);
    // Open flow panel if not open
    const flowIndex = flows.findIndex(f => f.name === flowName);
    if (!activeKeys.includes(flowIndex)) {
      let newActiveKeys = [...activeKeys, flowIndex];
      setActiveKeys(newActiveKeys);
    }
    await setAddStepDialogVisible(false);
    // @ts-ignore
    await setAddFlowDirty({...addFlowDirty, [flowName]: flows[flowIndex].steps.length});
  };

  const onCancel = () => {
    setDialogVisible(false);
    setStepDialogVisible(false);
    setAddStepDialogVisible(false);
    setAddExistingStepDialogVisible(false);
  };

  const isStepInFlow = (stepName, flowName) => {
    let result = false;
    let flow;
    if (flows) flow = flows.find(f => f.name === flowName);
    if (flow) result = flow["steps"].findIndex(s => s.stepName === stepName) > -1;
    return result;
  };

  const openFilePicker = () => {
    open();
    setStartRun(false);
  };

  /* Commenting all local storage settings, to be refactored and readded

  const getLocalStorageDataUser = () => {

    if (getUserPreferencesLS()) {
      if (getUserPreferencesLS()?.selectedStepsDataUser?.selectedStepOptions) {
        setSelectedStepOptions(getUserPreferencesLS().selectedStepsDataUser.selectedStepOptions);
      }
      if (getUserPreferencesLS()?.selectedStepsDataUser?.arrayLoadChecksSteps) {
        setArrayLoadChecksSteps(getUserPreferencesLS().selectedStepsDataUser.arrayLoadChecksSteps);
      }
      if (getUserPreferencesLS()?.selectedStepsDataUser?.allSelectedSteps) {
        setAllSelectedSteps(getUserPreferencesLS().selectedStepsDataUser.allSelectedSteps);
      }
    }
  };

  const tryParseJson = (userPreferences) => {
    try {
      return JSON.parse(userPreferences);
    } catch (e) {
      return false;
    }
  };

  const getUserPreferencesLS = () => {
    let userPreferences, oldOptions;
    const sessionUser = localStorage.getItem("dataHubUser");

    if (sessionUser) {
      userPreferences = getUserPreferences(sessionUser);
      if (userPreferences) {
        oldOptions = tryParseJson(userPreferences);
      } else { return false; }
    }

    return oldOptions;
  };



  const saveLocalStoragePreferences = (value: boolean, saveSelectedStepsDataUser?: boolean) => {

    const sessionUser = localStorage.getItem("dataHubUser");
    if (getUserPreferencesLS()) {
      let oldOptions = getUserPreferencesLS();
      let newOptions = {
        ...oldOptions,
        loadSelectedStepsUser: value,
      };

      if (saveSelectedStepsDataUser) {
        let newSelectedStepsDataUser = {
          selectedStepOptions: selectedStepOptions,
          arrayLoadChecksSteps: arrayLoadChecksSteps,
          allSelectedSteps: allSelectedSteps
        };

        newOptions = {
          ...oldOptions,
          loadSelectedStepsUser: value,
          selectedStepsDataUser: newSelectedStepsDataUser,
        };
      }
      updateUserPreferences(sessionUser ?? "", newOptions);
    }
  }; */

  const handleRunFlow = async (index, name) => {
    //setRunFlowClicked(true);
    //saveLocalStoragePreferences(false, true);
    const setKey = async () => {
      await setActiveKeys(`${index}`);
    };
    setRunningFlow(name);
    let flag = false;
    await allSelectedSteps[name].map(async step => {
      if (step.stepDefinitionType.toLowerCase() === "ingestion") {
        flag = true;
        setRunningStep(step);
        setSingleIngest(false);
        await setKey();
        await openFilePicker();
      }
    });
    if (!flag) {
      await runFlowSteps(name, allSelectedSteps[name])
        .then(() => {
        });
    }
  };

  const handleRunSingleStep = async (flowName, step) => {
    setShowUploadError(false);
    await runStep(flowName, step);
  };

  const uploadFiles = async () => {
    const filenames = fileList.map(({name}) => name);
    if (filenames.length) {
      let fl = fileList;
      const formData = new FormData();

      fl.forEach(file => {
        formData.append("files", file);
      });

      if (singleIngest) {
        await runStep(runningFlow, runningStep, formData)
          .then(resp => {
            setShowUploadError(true);
            setFileList([]);
          });
      } else {
        await runFlowSteps(runningFlow, allSelectedSteps[runningFlow], formData)
          .then(resp => {
            setShowUploadError(true);
            setFileList([]);
          });
      }
    }
  };

  const reorderFlow = (id, flowName, direction: ReorderFlowOrderDirection) => {
    let flowIdx = flows.findIndex((flow) => flow.name === flowName);
    const {steps, description} = flows[flowIdx];

    if (steps === undefined) return;
    let newSteps = [...steps];

    if (direction === ReorderFlowOrderDirection.RIGHT) {
      if (id <= steps.length - 2) {
        const oldLeftStep = newSteps[id];
        const oldRightStep = newSteps[id + 1];
        newSteps[id] = oldRightStep;
        newSteps[id + 1] = oldLeftStep;
      }
    } else {
      if (id >= 1) {
        const oldLeftStep = newSteps[id - 1];
        const oldRightStep = newSteps[id];
        newSteps[id - 1] = oldRightStep;
        newSteps[id] = oldLeftStep;
      }
    }

    let _steps: string[] = [];
    for (let i = 0; i < newSteps.length; i++) {
      newSteps[i].stepNumber = String(i + 1);
      _steps.push(newSteps[i].stepId);
    }
    //saveLocalStoragePreferences(true, true);

    const reorderedList = [...newSteps];
    onReorderFlow(flowIdx, reorderedList);
    updateFlow(flowName, description, _steps);
  };

  const getFlowWithJobInfo = async (flowNum) => {
    let currentFlow = flows[flowNum];

    if (currentFlow === undefined || currentFlow["steps"]===undefined) {
      return;
    }

    if (currentFlow["steps"].length > 0) {
      try {
        let response = await axios.get("/api/flows/" + currentFlow.name + "/latestJobInfo");
        if (response.status === 200 && response.data) {
          let currentFlowJobInfo = {};
          currentFlowJobInfo[currentFlow["name"]] = response.data["steps"];
          setLatestJobData(prevJobData => (
            {...prevJobData, ...currentFlowJobInfo}
          ));
        }
      } catch (error) {
        console.error("Error getting latest job info ", error);
      }
    }
  };

  const createFlowKeyDownHandler = (event) => {
    if (event.key === "Enter") {
      OpenAddNewDialog();
      event.preventDefault();
    }
  };
  return (
    <div id="flows-container" className={styles.flowsContainer}>
      {canReadFlow || canWriteFlow ?
        <>
          <div className={styles.createContainer}>
            {
              canWriteFlow ?
                <span>
                  {/* //Bootstrap Button
                  <Button
                    variant="primary"
                    onClick={OpenAddNewDialog}
                    onKeyDown={createFlowKeyDownHandler}
                    aria-label={"create-flow"}
                    tabIndex={0}
                  >Create Flow</Button> */}
                  <HCButton
                    className={styles.createButton}
                    variant="primary" onClick={OpenAddNewDialog} onKeyDown={createFlowKeyDownHandler}
                    aria-label={"create-flow"}
                    tabIndex={0}
                  >Create Flow</HCButton>
                </span>
                :
                <HCTooltip id="missing-permission-tooltip" placement="top" text={SecurityTooltips.missingPermission} className={styles.tooltipOverlay}>
                  <span className={styles.disabledCursor}>
                    <HCButton
                      className={styles.createButtonDisabled}
                      variant="primary"
                      disabled={true}
                      aria-label={"create-flow-disabled"}
                      tabIndex={-1}
                    >Create Flow</HCButton>
                  </span>
                </HCTooltip>
            }
          </div>
          {flows && flows.map((flow, i) => {
            return (<FlowPanel
              key={i}
              idx={i.toString()}
              flowRef={flowPanelsRef[flow.name]}
              flow={flow}
              flowRunning={flowRunning}
              flows={flows}
              steps={steps}
              allSelectedSteps={allSelectedSteps}
              setAllSelectedSteps={setAllSelectedSteps}
              runningStep={runningStep}
              isStepRunning={isStepRunning}
              latestJobData={latestJobData}
              canWriteFlow={canWriteFlow}
              canUserStopFlow={canUserStopFlow}
              hasOperatorRole={hasOperatorRole}
              getFlowWithJobInfo={getFlowWithJobInfo}
              openFilePicker={openFilePicker}
              handleRunSingleStep={handleRunSingleStep}
              handleRunFlow={handleRunFlow}
              handleStepAdd={handleStepAdd}
              handleStepDelete={handleStepDelete}
              handleFlowDelete={handleFlowDelete}
              stopRun={stopRun}
              reorderFlow={reorderFlow}
              getRootProps={getRootProps}
              getInputProps={getInputProps}
              showUploadError={showUploadError}
              uploadError={uploadError}
              setRunningFlow={setRunningFlow}
              setRunningStep={setRunningStep}
              setJobId={setJobId}
              setShowUploadError={setShowUploadError}
              setSingleIngest={setSingleIngest}
              setOpenJobResponse={setOpenJobResponse}
              setNewFlow={setNewFlow}
              setFlowData={setFlowData}
              setTitle={setTitle}
              setActiveKeys={setActiveKeys}
              activeKeys={activeKeys}
            />);
          })}
          <NewFlowDialog
            newFlow={newFlow || openNewFlow}
            title={title}
            setNewFlow={setNewFlow}
            setAddedFlowName={setAddedFlowName}
            createFlow={createFlow}
            createAdd={createAdd}
            updateFlow={updateFlow}
            flowData={flowData}
            canWriteFlow={canWriteFlow}
            addStepToFlow={addStepToFlow}
            newStepToFlowOptions={newStepToFlowOptions}
            setOpenNewFlow={setOpenNewFlow}
          />
          {deleteConfirmationModal(dialogVisible, flowName, onDeleteFlowOk, onCancel)}
          {deleteStepConfirmationModal(stepDialogVisible, stepName, stepNumber, flowName, onStepOk, onCancel)}
          {addStepConfirmationModal(addStepDialogVisible, onAddStepOk, onCancel, flowName, stepName, stepType, isStepInFlow)}
          {addExistingStepConfirmationModal(addExistingStepDialogVisible, stepName, flowName, onConfirmOk, onCancel)}
        </> :
        <div></div>
      }
    </div>
  );
};

export default Flows;
