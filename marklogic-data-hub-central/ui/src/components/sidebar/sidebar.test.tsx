import Sidebar, {Props} from "./sidebar";
import {entityFromJSON, entityParser} from "../../util/data-conversion";
import {fireEvent, render} from "@testing-library/react";

import React from "react";
import {getEnvironment} from "@util/environment";
import {modelResponse} from "../../assets/mock-data/explore/model-response";
import searchPayloadFacets from "../../assets/mock-data/explore/search-payload-facets";
import userEvent from "@testing-library/user-event";

const entityIndicatorData = {
  max: 10,
  entities: {

  }
};

const parsedModelData = entityFromJSON(modelResponse);
const entityDefArray = entityParser(parsedModelData);

const defaultProps: Props = {
  facets: searchPayloadFacets,
  selectedEntities: [],
  entityDefArray: entityDefArray,
  facetRender: jest.fn(),
  checkFacetRender: jest.fn(),
  setDatabasePreferences: jest.fn(),
  greyFacets: [],
  setHubArtifactsVisibilityPreferences: jest.fn(),
  hideDataHubArtifacts: false,
  cardView: false,
  graphView: false,
  setEntitySpecificPanel: jest.fn(),
  currentBaseEntities: [],
  setCurrentBaseEntities: jest.fn(),
  currentRelatedEntities: new Map<string, any>(),
  setCurrentRelatedEntities: jest.fn(),
  entityIndicatorData: entityIndicatorData,
  entitiesWithRelatedConcepts: []
};

describe("Sidebar createdOn face time window dropdown", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });


  test("Verify createdOn dropdown is rendered", () => {
    const {getByText} = render(<Sidebar
      {...defaultProps}
    />);
    expect(getByText("Select time")).toBeInTheDocument();
  });

  test("Verify createdOn dropdown is selected", () => {
    const {getByText, getByPlaceholderText, getByLabelText} = render(<Sidebar
      {...defaultProps}
    />);
    expect(getByText("Select time")).toBeInTheDocument();
    fireEvent.keyDown(getByLabelText("date-select"), {key: "ArrowDown"});
    expect(getByText("Custom")).toBeInTheDocument();
    fireEvent.click(getByText("Custom"));
    expect(getByPlaceholderText("Start date ~ End date")).toBeInTheDocument();
  });

  test("Verify that hub properties is expanded by default", () => {
    const {getByText} = render(<Sidebar
      {...defaultProps}
    />);
    expect(document.querySelector("#hub-properties .accordion-button")).toHaveAttribute("aria-expanded", "true");
    userEvent.click(getByText("Hub Properties"));
    expect(document.querySelector("#hub-properties .accordion-button")).toHaveAttribute("aria-expanded", "false");
  });

  //******TEST WITH NEW ENTITY-SPECIFIC PANEL DHFPROD-7950*********
  // test("Verify entity properties, marked as facetable in entityModel, are rendered properly as facets", () => {
  //   const {getByText, getByTestId} = render(<Sidebar
  //     entityDefArray={entityDefArray}
  //     facets={searchPayloadFacets}
  //     selectedEntities={["Customer"]}
  //     facetRender = {jest.fn()}
  //     checkFacetRender = {jest.fn()}
  //     currentRelatedEntities={new Map<string, any>()}
  //     setCurrentRelatedEntities={jest.fn()}
  //     currentBaseEntities={[]}
  //     setCurrentBaseEntities={jest.fn()}
  //   />);
  //   expect(getByText("Entity Properties")).toBeInTheDocument(); //Checking if Entity Properties label is available

  //   //Validate if gender property and its values
  //   expect(getByTestId("gender-facet")).toBeInTheDocument();
  //   expect(getByText("F")).toBeInTheDocument();
  //   expect(getByText("454")).toBeInTheDocument(); //Count of documents with gender as F
  //   expect(getByText("M")).toBeInTheDocument();
  //   expect(getByText("546")).toBeInTheDocument(); //Count of documents with gender as M

  //   //Validate if sales_region property and its values
  //   expect(getByTestId("sales_region-facet")).toBeInTheDocument();
  //   expect(getByText("Alabama")).toBeInTheDocument();
  //   expect(getByText("18")).toBeInTheDocument(); //Count of documents with sales region as Alabama
  //   expect(getByText("Alaska")).toBeInTheDocument();
  //   expect(getByText("15")).toBeInTheDocument(); //Count of documents with sales region as Alaska
  // });

  test("Verify onclick is called for final/staging buttons", () => {
    const {getByText} = render(
      <Sidebar
        {...defaultProps}
        selectedEntities={["Customer"]}
      />
    );

    // Check Final/Staging buttons show the custom database names

    const getFinalDbLabel = () => {
      let finalDbLabel = getEnvironment().finalDb ? getEnvironment().finalDb : "Final";
      if (finalDbLabel.toLowerCase().includes("final")) finalDbLabel = "Final";
      return finalDbLabel;
    };

    const getStagingDbLabel = () => {
      let stagingDbLabel = getEnvironment().stagingDb ? getEnvironment().stagingDb : "Staging";
      if (stagingDbLabel.toLowerCase().includes("staging")) stagingDbLabel = "Staging";
      return stagingDbLabel;
    };

    const finalDatabaseButton = getByText(getFinalDbLabel());
    const stagingDatabaseButton = getByText(getStagingDbLabel());
    finalDatabaseButton.onclick = jest.fn();
    stagingDatabaseButton.onclick = jest.fn();
    fireEvent.click(finalDatabaseButton);
    expect(finalDatabaseButton.onclick).toHaveBeenCalledTimes(1);
    fireEvent.click(stagingDatabaseButton);
    expect(stagingDatabaseButton.onclick).toHaveBeenCalledTimes(1);
  });

  test("Collapse/Expand carets render properly for database and hub properties", () => {
    const {getByText} = render(
      <Sidebar
        {...defaultProps}
      />
    );
    expect(document.querySelector("#database .accordion-button.after-indicator")).toHaveAttribute("aria-expanded", "true");
    expect(document.querySelector("#database .accordion-collapse")).not.toHaveClass("collapsed");
    userEvent.click(getByText("Database"));
    expect(document.querySelector("#database .accordion-button.after-indicator")).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector("#database .accordion-collapse")).not.toHaveClass("collapse");

    expect(document.querySelector("#hub-properties .accordion-button.after-indicator")).toHaveAttribute("aria-expanded", "true");
    expect(document.querySelector("#hub-properties .accordion-collapse")).not.toHaveClass("collapsed");
    userEvent.click(getByText("Hub Properties"));
    expect(document.querySelector("#hub-properties .accordion-button.after-indicator")).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector("#hub-properties .accordion-collapse")).not.toHaveClass("collapse");
  });

  test("Collapse/Expand carets render properly for database, entity and hub properties", async () => {
    const {getByText} = render(
      <Sidebar
        {...defaultProps}
        selectedEntities={["Customer"]}
      />
    );
    expect(document.querySelector("#database .accordion-button.after-indicator")).toHaveAttribute("aria-expanded", "true");
    expect(document.querySelector("#database .accordion-collapse")).not.toHaveClass("collapsed");
    userEvent.click(getByText("Database"));
    expect(document.querySelector("#database .accordion-button.after-indicator")).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector("#database .accordion-collapse")).not.toHaveClass("collapse");

  });

  test("Verify Include Data Hub Artifacts switch is rendered properly and user is able to toggle it", () => {
    const {getByTestId} = render(
      <Sidebar
        {...defaultProps}
        selectedEntities={["Customer"]}
        cardView={true}
        hideDataHubArtifacts={true}
      />
    );

    const includeHubArtifactsSwitch = getByTestId("toggleHubArtifacts");
    includeHubArtifactsSwitch.onclick = jest.fn();

    expect(includeHubArtifactsSwitch).not.toBeChecked(); //Siwtch is not checked by default

    userEvent.click(includeHubArtifactsSwitch); //Enabling the switch
    expect(includeHubArtifactsSwitch).toBeChecked();
    expect(includeHubArtifactsSwitch.onclick).toHaveBeenCalledTimes(1);

    userEvent.click(includeHubArtifactsSwitch); //Disabling the switch
    expect(includeHubArtifactsSwitch).not.toBeChecked();
    expect(includeHubArtifactsSwitch.onclick).toHaveBeenCalled();

  });
});
