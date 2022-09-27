import "./flows.scss";

import * as _ from "lodash";
import {HCButton, HCTooltip} from "@components/common";
import {useLocation} from "react-router-dom";
import {SecurityTooltips} from "@config/tooltips.config";
import React, {createRef, useEffect, useState} from "react";
import {getViewSettings, setViewSettings} from "@util/user-context";
// import {getUserPreferences, updateUserPreferences} from "../../../src/services//user-preferences";
import {Flow, Step} from "../../types/run-types";
import NewFlowDialog from "./new-flow-dialog/new-flow-dialog";
import axios from "axios";
import styles from "./flows.module.scss";
import {useDropzone} from "react-dropzone";
import {deleteConfirmationModal, deleteStepConfirmationModal, addStepConfirmationModal, addExistingStepConfirmationModal} from "./confirmation-modals";
import FlowPanel from "./flow-panel/flowPanel";

enum ReorderFlowOrderDirection {
  LEFT = "left",
  RIGHT = "right"
}

export interface Props {
  flows: Flow[];
  steps: Step[];
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
  const [selectedStepOptions, setSelectedStepOptions] = useState<any>({}); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [currentFlowName, setCurrentFlowName] = useState(""); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [arrayLoadChecksSteps, setArrayLoadChecksSteps] = useState<any>([{flowName: "", stepNumber: -1}]);
  const [selectedStepDetails, setSelectedStepDetails] = useState<any>([{stepName: "", stepNumber: -1, stepDefinitionType: "", isChecked: false}]);
  const [flowsDeepCopy, setFlowsDeepCopy] = useState<any>([]);
  const [checkAll, setCheckAll] = useState({});
  const location = useLocation();

  // maintain a list of panel refs
  const flowPanelsRef: any = flows.reduce((p, n) => ({...p, ...{[n.name]: createRef()}}), {});

  // Persists active keys in session storage as a user interacts with them
  useEffect(() => {
    if (activeKeys === undefined) {
      return;
    }
    const newStorage = {...storage, run: {...storage.run, openFlows: activeKeys}};
    setViewSettings(newStorage);
  }, [activeKeys]);

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

    if ((flows !== undefined || flows !== null)) {
      setFlowsDeepCopy(_.cloneDeep(flows));
      flows.map((flow) => (
        flow?.steps && flow.steps.forEach((step) => {
          controlsCheckboxes(step, step.stepDefinitionType?.toLowerCase(), flow.name);
        })
      ));

    /*   //Getting local storage in the load of the page if it exists
      if (getUserPreferencesLS() && getUserPreferencesLS()?.loadSelectedStepsUser) {
        if (getUserPreferencesLS()?.selectedStepsDataUser && Object.keys(getUserPreferencesLS().selectedStepsDataUser?.selectedStepOptions).length !== 0) {
          getLocalStorageDataUser();

        }
      } */
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

  useEffect(() => {
    if (flows && flows.length > 0) {
      const auxObj = {};
      flows.forEach((flow) => {
        if (flow.steps === undefined) return;
        if (flow.steps.find((step) => step.stepDefinitionType.toLowerCase() !== "ingestion" && !selectedStepOptions[flow.name + "-" + step.stepName + "-" + step.stepDefinitionType.toLowerCase()])) {
          auxObj[flow.name] = false;
        } else if (flow.steps.find((step) => step.stepDefinitionType.toLowerCase() === "ingestion" && selectedStepOptions[flow.name + "-" + step.stepName + "-" + step.stepDefinitionType.toLowerCase()])) {
          auxObj[flow.name] = true;
        } else if (flow.steps.find((step) => step.stepDefinitionType.toLowerCase() === "ingestion" && !selectedStepOptions[flow.name + "-" + step.stepName + "-" + step.stepDefinitionType.toLowerCase()])) {
          auxObj[flow.name] = false;
        } else {
          auxObj[flow.name] = true;
        }
      });
      setCheckAll(auxObj);
    }
  }, [flows, selectedStepOptions, setCheckAll]);

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

  useEffect(() => {
    //When Refreshing or leaving the page, save the flag to get the local storage
    return () => {
      //saveLocalStoragePreferences(true);
    };
  }, []);

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
    customRequest();
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

  const onOk = (name) => {
    deleteFlow(name);
    setDialogVisible(false);
  };

  const onStepOk = (flowName, stepNumber) => {

    // let stepToDrop = selectedStepDetails?.find(function (obj) {
    //   if (
    //     obj.flowName === flowName
    //     && obj.stepNumber === stepNumber
    //   ) return obj;
    // });

    // //Drop step
    // let arrayObjectsStepDetails = selectedStepDetails;
    // for (let i = 0; i < arrayObjectsStepDetails?.length; i++) {
    //   if (arrayObjectsStepDetails[i]?.stepNumber === stepNumber && arrayObjectsStepDetails[i]?.flowName === flowName) { // checkedValues es step name
    //     arrayObjectsStepDetails.splice(i, 1);
    //   }
    // }

    // //Drop load check
    // let arrayObjectsLoadChecksSteps = arrayLoadChecksSteps;
    // if (stepToDrop && stepToDrop?.stepDefinitionType.toLowerCase() === "ingestion") {
    //   for (let i = 0; i < arrayObjectsLoadChecksSteps?.length; i++) {
    //     if (arrayObjectsLoadChecksSteps[i]?.stepNumber === stepNumber && arrayObjectsLoadChecksSteps[i]?.flowName === flowName) { // checkedValues es step name
    //       arrayObjectsLoadChecksSteps.splice(i, 1);
    //     }
    //   }
    // }

    // let arraySelectedStepOptions = selectedStepOptions;
    // delete arraySelectedStepOptions[flowName + "-" + stepToDrop?.stepName + "-" + stepToDrop?.stepDefinitionType?.toLowerCase()];
    // const {[flowName + "-" + stepToDrop?.stepName + "-" + stepToDrop?.stepDefinitionType?.toLowerCase()]: foo, ...newObject} = arraySelectedStepOptions;

    // setSelectedStepDetails(arrayObjectsStepDetails);
    // setArrayLoadChecksSteps(arrayObjectsLoadChecksSteps);
    // setSelectedStepOptions(newObject);

    resetSelectedFlow(flowName);
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

  const onCheckboxChange = (event, checkedValues?, stepNumber?, stepDefinitionType?, flowNames?, stepId?, sourceFormat?, fromCheckAll?) => {
    let checkAllAux;
    if (event !== "default" && fromCheckAll) {
      checkAllAux = checkAll[flowNames] ? false : true;
      setCheckAll((prevState) => ({...prevState, [flowNames]: checkAllAux}));
    }

    if (checkAll[flowNames] && !fromCheckAll) {
      setCheckAll((prevState) => ({...prevState, [flowNames]: !checkAll[flowNames]}));
    }

    if (currentFlowName !== flowNames) {
      setCurrentFlowName(flowNames);
    }

    if (fromCheckAll) {
      if (checkAll[flowNames]) {

        let stepsSelectedFlow = selectedStepDetails.filter(function (obj) {
          return obj.flowName === flowNames;
        });

        stepsSelectedFlow.forEach((obj) => {
          let selectedStepOptionsAux = selectedStepOptions;
          selectedStepOptionsAux[flowNames + "-" + obj.stepName + "-" + obj?.stepDefinitionType?.toLowerCase()] = false;
          setSelectedStepOptions(selectedStepOptionsAux);
        });

        if (currentFlowName.length > 0) {
          let selectedStepDetailsAux = selectedStepDetails.filter(function (obj) {
            return obj.flowName !== flowNames && obj.stepName !== checkedValues;
          });
          setSelectedStepDetails(selectedStepDetailsAux);
          selectedStepDetails.shift();
        }

        let arrayLoadChecksStepsAux = arrayLoadChecksSteps;
        arrayLoadChecksStepsAux.map(function (obj) {
          if (obj.flowName === flowNames) obj.checked = false;
        });
        setArrayLoadChecksSteps(arrayLoadChecksStepsAux);

      } else {
        {
          flows.map((flow) => (
            flow["name"] === flowNames &&
            flow?.steps && flow.steps.forEach((step) => {
              controlsCheckboxes(step, step.stepDefinitionType, flow.name);
            })));

        }
      }
    } else {

      let originRender = event !== "default";
      let data = {stepName: "", stepNumber: -1, stepDefinitionType: "", isChecked: false, flowName: "", stepId: "", sourceFormat: ""};

      data.stepName = checkedValues;
      data.stepNumber = stepNumber;
      data.stepDefinitionType = stepDefinitionType;
      data.isChecked = originRender ? event.target.checked : true;
      data.flowName = flowNames;
      data.stepId = stepId;
      data.sourceFormat = sourceFormat;



      let obj = [...selectedStepDetails];
      if (data.isChecked) {
        let checkDuplicateObject = selectedStepDetails?.find((obj) => obj.stepId === data.stepId && obj.flowName === data.flowName);
        const isLoadingStepAdded = selectedStepDetails.find((element) => element.flowName === data.flowName && element.stepDefinitionType.toLowerCase() === "ingestion");

        if (!checkDuplicateObject) {
          if (!isLoadingStepAdded || data.stepDefinitionType.toLowerCase() !== "ingestion") {
            obj.push(data);
          }
        } else {
          selectedStepDetails.map((obj) => {
            if (obj.stepId === data.stepId && obj.flowName === data.flowName) {
              obj.stepNumber = stepNumber;
            }
          });
        }
      } else {
        for (let i = 0; i < obj.length; i++) {
          if (obj[i].stepName === checkedValues) {
            obj.splice(i, 1);
          }
        }
      }

      if (originRender && stepDefinitionType.toLowerCase() === "ingestion") {
        handleArrayLoadChecksSteps(flowNames, checkedValues, stepNumber, stepDefinitionType);
      } else if (!originRender && stepDefinitionType.toLowerCase() === "ingestion") {
        handleArrayLoadChecksSteps(flowNames, checkedValues, stepNumber, stepDefinitionType, "default");
      }

      setSelectedStepDetails(obj);

      selectedStepOptions[flowNames + "-" + checkedValues + "-" + stepDefinitionType?.toLowerCase()] = data.isChecked;

      const flowIngestionSteps = Object.keys(selectedStepOptions).filter((key) => key.includes("ingestion") && key.includes(flowNames));

      if (flowIngestionSteps.length > 1 && stepDefinitionType?.toLowerCase() === "ingestion" && data.isChecked) {
        flowIngestionSteps.forEach((key) => {
          if (key !== flowNames + "-" + checkedValues + "-" + stepDefinitionType?.toLowerCase() && !selectedStepOptions[key]) {
            selectedStepOptions[key] = !data.isChecked;
          } else if (key === flowNames + "-" + checkedValues + "-" + stepDefinitionType?.toLowerCase()) {
            selectedStepOptions[key] = data.isChecked;
          } else if (selectedStepOptions[key]) {
            selectedStepOptions[flowNames + "-" + checkedValues + "-" + stepDefinitionType?.toLowerCase()] = false;
          }
        });
      }

      setSelectedStepOptions({...selectedStepOptions, [flowNames + "-" + checkedValues + "-" + stepDefinitionType?.toLowerCase()]: originRender ? event.target.checked : true});

      // saveLocalStoragePreferences(true, true);
      if (originRender) event.stopPropagation();
    }
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
      if (getUserPreferencesLS()?.selectedStepsDataUser?.selectedStepDetails) {
        setSelectedStepDetails(getUserPreferencesLS().selectedStepsDataUser.selectedStepDetails);
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
          selectedStepDetails: selectedStepDetails
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

  let flagOneLoadSelected = true, flowNameCheckAux = "";
  const handleArrayLoadChecksSteps = (flowNameCheck, stepName, stepNumber, stepDefinitionType, origin?) => {
    let loadCheckStep;
    let loadStep = arrayLoadChecksSteps.find((element) => element.flowName === flowNameCheck && element.checked === true);

    stepDefinitionType = stepDefinitionType ? stepDefinitionType.toLowerCase() : "";

    let valueCheck = selectedStepOptions[flowNameCheck + "-" + stepName + "-" + stepDefinitionType.toLowerCase()] === true ? true : false;

    loadCheckStep = arrayLoadChecksSteps?.find(function (obj) {
      if (obj?.stepId === flowNameCheck + "-" + stepName + "-" + stepDefinitionType) return true;
    });

    if (!loadStep) {
      if (loadCheckStep) { loadCheckStep.checked = origin === "default" ? valueCheck : !valueCheck; } else
      if (stepDefinitionType) {
        loadCheckStep = {flowName: "", stepNumber: -1, checked: false};
        loadCheckStep.flowName = flowNameCheck;
        loadCheckStep.stepNumber = stepNumber;
        loadCheckStep.checked = origin === "default" ? true : !valueCheck;
        loadCheckStep.stepId = flowNameCheck + "-" + stepName + "-" + stepDefinitionType;
        arrayLoadChecksSteps.push(loadCheckStep);
      }
    } else {
      if (loadCheckStep && loadCheckStep.stepId === loadStep.stepId) { loadCheckStep.checked = origin === "default" ? valueCheck : !valueCheck; } else {
        if (stepDefinitionType && !loadCheckStep) {
          loadCheckStep = {flowName: "", stepNumber: -1, checked: false};
          loadCheckStep.flowName = flowNameCheck;
          loadCheckStep.stepNumber = stepNumber;
          loadCheckStep.checked = origin === "default" ? false : !valueCheck;
          loadCheckStep.stepId = flowNameCheck + "-" + stepName + "-" + stepDefinitionType;
          arrayLoadChecksSteps.push(loadCheckStep);
        }
      }
      setArrayLoadChecksSteps(arrayLoadChecksSteps);
    }
  };

  const controlsCheckboxes = (step, stepDefinition, flowNameCheck) => {

    if (flowNameCheckAux !== flowNameCheck) { flowNameCheckAux = flowNameCheck; flagOneLoadSelected = true; }

    if (stepDefinition.toLowerCase() === "ingestion") {
      if (flagOneLoadSelected) {
        if (flowNameCheckAux === flowNameCheck) {
          flagOneLoadSelected = false;
          onCheckboxChange("default", step.stepName, step.stepNumber, step.stepDefinitionType?.toLowerCase(), flowNameCheck, step.stepId, step.sourceFormat);
        } else {
          flagOneLoadSelected = true; flowNameCheckAux = flowNameCheck;
        }
      }
      handleArrayLoadChecksSteps(flowNameCheck, step.stepName, step.stepNumber, step.stepDefinitionType?.toLowerCase(), "default");
    } else {
      onCheckboxChange("default", step.stepName, step.stepNumber, step.stepDefinitionType?.toLowerCase(), flowNameCheck, step.stepId, step.sourceFormat);
    }
  };

  const handleRunFlow = async (index, name) => {
    //setRunFlowClicked(true);
    //saveLocalStoragePreferences(false, true);
    const setKey = async () => {
      await setActiveKeys(`${index}`);
    };
    setRunningFlow(name);
    let flag = false;
    await selectedStepDetails.map(async step => {
      if (step.stepDefinitionType.toLowerCase() === "ingestion" && step.flowName === name && step.isChecked) {
        flag = true;
        setRunningStep(step);
        setSingleIngest(false);
        await setKey();
        await openFilePicker();
      }
    });
    if (Object.keys(selectedStepOptions).length === 0 && selectedStepOptions.constructor === Object) {
      flag = true;
      await setKey();
      await openFilePicker();
    }
    if (!flag) {
      let _selectedStepDetails= [...selectedStepDetails];
      let _selectedSteps: Step[] = _selectedStepDetails.filter((step) => {
        return (step.flowName === name && step.isChecked === true);
      });

      await runFlowSteps(name, _selectedSteps)
        .then(() => {
          // setSelectedStepOptions({});
          // setSelectedStepDetails([{stepName: "", stepNumber: -1, stepDefinitionType: "", isChecked: false}]);
          // setArrayLoadChecksSteps([{flowName: "", stepNumber: -1}]);
        });
    }

  };

  const handleRunSingleStep = async (flowName, step) => {
    setShowUploadError(false);
    await runStep(flowName, step);
  };

  const customRequest = async () => {
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
        let stepNumbers = [{}];

        stepNumbers = selectedStepDetails.filter(function (step) {
          return step.flowName === runningFlow && step.isChecked === true;
        });

        await runFlowSteps(runningFlow, stepNumbers, formData)
          .then(resp => {
            setShowUploadError(true);
            setFileList([]);
            // setSelectedStepOptions({});
            // setSelectedStepDetails([{stepName: "", stepNumber: -1, stepDefinitionType: "", isChecked: false}]);
            // setArrayLoadChecksSteps([{flowName: "", stepNumber: -1}]);
            //setRunFlowClicked(false);
          });
      }
    }
  };

  const resetSelectedFlow = (flowName) => {
    let arrayObjectsStepDetails = [...selectedStepDetails];
    const arrayObjectsStepDetailsAux = arrayObjectsStepDetails.filter((step) => {
      return step.flowName === flowName;
    });
    setSelectedStepDetails(arrayObjectsStepDetailsAux);

    let arrayObjectsLoadChecksSteps = [...arrayLoadChecksSteps];
    for (let i = 0; i < arrayObjectsLoadChecksSteps?.length; i++) {
      if (arrayObjectsLoadChecksSteps[i]?.flowName === flowName?.trim()) {
        arrayObjectsLoadChecksSteps.splice(i, 1);
      }
    }
    setArrayLoadChecksSteps(arrayObjectsLoadChecksSteps);

    let arraySelectedStepOptions = {...selectedStepOptions};
    for (let key in arraySelectedStepOptions) if (key.startsWith(flowName + "-")) delete arraySelectedStepOptions[key];
    setSelectedStepOptions(arraySelectedStepOptions);



  };

  const reorderFlow = (id, flowName, direction: ReorderFlowOrderDirection) => {
    let flowNum = flows.findIndex((flow) => flow.name === flowName);
    let flowDesc = flows[flowNum]["description"];
    const stepList = flows[flowNum]["steps"];
    if (stepList === undefined) return;
    let newSteps = stepList;

    if (direction === ReorderFlowOrderDirection.RIGHT) {
      if (id <= stepList.length - 2) {
        newSteps = [...stepList];
        const oldLeftStep = newSteps[id];
        const oldRightStep = newSteps[id + 1];
        newSteps[id] = oldRightStep;
        newSteps[id + 1] = oldLeftStep;
      }
    } else {
      if (id >= 1) {
        newSteps = [...stepList];
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

    resetSelectedFlow(flowName);
    //saveLocalStoragePreferences(true, true);


    const reorderedList = [...newSteps];
    onReorderFlow(flowNum, reorderedList);
    updateFlow(flowName, flowDesc, _steps);

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
              flowsDeepCopy={flowsDeepCopy}
              steps={steps}
              selectedSteps={selectedStepDetails}
              selectedStepOptions={selectedStepOptions}
              runningStep={runningStep}
              isStepRunning={isStepRunning}
              latestJobData={latestJobData}
              arrayLoadChecksSteps={arrayLoadChecksSteps}
              canWriteFlow={canWriteFlow}
              canUserStopFlow={canUserStopFlow}
              hasOperatorRole={hasOperatorRole}
              checkAll={checkAll}
              getFlowWithJobInfo={getFlowWithJobInfo}
              openFilePicker={openFilePicker}
              handleRunSingleStep={handleRunSingleStep}
              handleRunFlow={handleRunFlow}
              handleStepAdd={handleStepAdd}
              handleStepDelete={handleStepDelete}
              handleFlowDelete={handleFlowDelete}
              stopRun={stopRun}
              reorderFlow={reorderFlow}
              onCheckboxChange={onCheckboxChange}
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
          {deleteConfirmationModal(dialogVisible, flowName, onOk, onCancel)}
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
