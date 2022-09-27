
import React, {useContext, CSSProperties} from "react";
import {HCCard, HCTooltip} from "@components/common";
import {faArrowAltCircleLeft, faArrowAltCircleRight} from "@fortawesome/free-regular-svg-icons";
import {PlayCircleFill, X} from "react-bootstrap-icons";
import {themeColors} from "@config/themes.config";
import {Link} from "react-router-dom";
import {StepDefinitionTypeTitles, ReorderFlowOrderDirection} from "../types";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {RunToolTips} from "@config/tooltips.config";
import styles from "../flows.module.scss";
import {AuthoritiesContext} from "@util/authorities";

interface Props {
  index: number;
  step: any;
  flow: any;
  openFilePicker: any;
  setRunningStep: any;
  setRunningFlow: any;
  handleStepDelete: any;
  handleRunSingleStep: any;
  latestJobData: any;
  lastRunResponse: any;
  reorderFlow: any;
  canWriteFlow: boolean;
  hasOperatorRole: boolean;
  getRootProps:any;
  getInputProps:any;
  setSingleIngest: any;
  showLinks: any;
  setShowLinks: any;
  setShowUploadError:any;
  sourceFormatOptions: any;
  runningStep: any;
  flowRunning: any;
  showUploadError: any;
  uploadError: any;
}

const FlowCard: React.FC<Props> = ({index, step, flow, openFilePicker,
  setRunningStep,
  setRunningFlow,
  handleStepDelete,
  handleRunSingleStep,
  latestJobData,
  lastRunResponse,
  reorderFlow,
  canWriteFlow,
  hasOperatorRole,
  getRootProps,
  getInputProps,
  setSingleIngest,
  showLinks,
  setShowLinks,
  setShowUploadError,
  sourceFormatOptions,
  runningStep,
  flowRunning,
  showUploadError,
  uploadError
}) => {
  const {stepNumber, sourceFormat} = step;

  let viewStepId = `${flow.name}-${stepNumber}`;
  let stepDefinitionType = step.stepDefinitionType ? step.stepDefinitionType.toLowerCase() : "";
  let stepDefinitionTypeTitle = StepDefinitionTypeTitles[stepDefinitionType];
  let stepWithJobDetail = latestJobData && latestJobData[flow.name] && latestJobData[flow.name] ? latestJobData[flow.name].find(el => el.stepId === step.stepId) : null;

  const reorderFlowKeyDownHandler = (event, index, flowName, direction) => {
    if (event.key === "Enter") {
      reorderFlow(index, flowName, direction);
      event.preventDefault();
    }
  };

  const handleMouseOver = (e, name) => {
    setShowLinks(name);
  };

  // For role-based privileges
  const authorityService = useContext(AuthoritiesContext);
  const authorityByStepType = {
    ingestion: authorityService.canReadLoad(),
    mapping: authorityService.canReadMapping(),
    matching: authorityService.canReadMatchMerge(),
    merging: authorityService.canReadMatchMerge(),
    custom: authorityService.canReadCustom()
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
                <div {...getRootProps()} style={{display: "inline-block"}}>
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
            style={{display: showLinks === viewStepId && step.stepId && authorityByStepType[stepDefinitionType] ? "block" : "none"}}
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
};

export default FlowCard;