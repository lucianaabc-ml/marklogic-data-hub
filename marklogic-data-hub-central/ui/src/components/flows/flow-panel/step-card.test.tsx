import React from "react";
import { Router } from "react-router";
import { render, fireEvent, cleanup, wait } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/extend-expect";
import StepCard, { Props } from './step-card';
import data from "../../../assets/mock-data/curation/flows.data";
import { createMemoryHistory } from "history";
const history = createMemoryHistory();
import sourceFormatOptions from "@config/formats.config";

const step = data.flows.data[0].steps[1];
const flow = data.flows.data[0];

const defaultProps: Props = {
  index: 2,
  step: step,
  flow: flow,
  openFilePicker: jest.fn(),
  setRunningStep: jest.fn(),
  setRunningFlow:jest.fn(),
  handleStepDelete: jest.fn(),
  handleRunSingleStep: jest.fn(),
  latestJobData: "",
  lastRunResponse: jest.fn(),
  reorderFlow: jest.fn(),
  canWriteFlow: true,
  hasOperatorRole: true,
  getRootProps:jest.fn(),
  getInputProps:jest.fn(),
  setSingleIngest: jest.fn(),
  showLinks: "",
  setShowLinks: jest.fn(),
  setShowUploadError:jest.fn(),
  sourceFormatOptions: sourceFormatOptions,
  runningStep: undefined,
  flowRunning: {name:"", steps: []},
  showUploadError: "",
  uploadError: ""
}


describe("Flow Card test suite", () => {

  it("links for steps lead to correct path", async () => {
    const { getByLabelText } = render(
      <Router history={history}><StepCard
        {...defaultProps}
      /></Router>
    );
    const steps =data.flows.data[0].steps;
    const flowName=flow.name;

    let i: number;
    // Curate link
    const pathname = `http://localhost/tiles/curate`;
    expect(getByLabelText(`${flowName}-${step.stepNumber}-cardlink`).firstChild?.href).toBe(pathname);
  });

  it("links for steps lead to correct path 2ay", async () => {
    const newStep = flow.steps[0]; 
    const { getByLabelText } = render(
      <Router history={history}><StepCard
        {...defaultProps}
        step={newStep}
      /></Router>
    );
    const steps =data.flows.data[0].steps;
    const flowName=flow.name;

    // Load link
    const pathname = `http://localhost/tiles/load`;
    expect(getByLabelText(`${flowName}-${newStep.stepNumber}-cardlink`).firstChild?.href).toBe(pathname);
  });

  it("reorder flow buttons can be focused and pressed by keyboard", async () => {
    const { getByLabelText } = render(
      <Router history={history}><StepCard
        {...defaultProps}
      /></Router>
    );
    const steps =data.flows.data[0].steps;
    const flowName=data.flows.data[0].name;
    
    const rightArrowButton = getByLabelText("rightArrow-" + step.stepName);
    expect(rightArrowButton).toBeInTheDocument();
    rightArrowButton.focus();
    expect(rightArrowButton).toHaveFocus();

    userEvent.tab();
    expect(rightArrowButton).not.toHaveFocus();
    userEvent.tab({ shift: true });
    expect(rightArrowButton).toHaveFocus();

    const leftArrowButton = getByLabelText("leftArrow-" + step.stepName);
    expect(leftArrowButton).toBeInTheDocument();
    leftArrowButton.focus();
    expect(leftArrowButton).toHaveFocus();

    userEvent.tab();
    expect(leftArrowButton).not.toHaveFocus();
    userEvent.tab({ shift: true });
    expect(leftArrowButton).toHaveFocus();

    // Verifying a user can press enter to reorder steps in a flow
    rightArrowButton.onkeydown = jest.fn();
    fireEvent.keyDown(rightArrowButton, { key: "Enter", code: "Enter" });
    expect(rightArrowButton.onkeydown).toHaveBeenCalledTimes(1);

    leftArrowButton.onkeydown = jest.fn();
    fireEvent.keyDown(leftArrowButton, { key: "Enter", code: "Enter" });
    expect(leftArrowButton.onkeydown).toHaveBeenCalledTimes(1);
  })
})