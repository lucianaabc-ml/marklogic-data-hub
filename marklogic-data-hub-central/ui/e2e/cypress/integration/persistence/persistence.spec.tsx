import {Application} from "../../support/application.config";
import {confirmationModal, toolbar} from "../../support/components/common";
import propertyTable from "../../support/components/model/property-table";
import curatePage from "../../support/pages/curate";
import loadPage from "../../support/pages/load";
import graphVis from "../../support/components/model/graph-vis";
import LoginPage from "../../support/pages/login";
import modelPage from "../../support/pages/model";
import {ConfirmationType} from "../../support/types/modeling-types";
import {
  entityTypeTable,
  graphViewSidePanel
} from "../../support/components/model/index";

describe("Validate persistence across Hub Central", () => {
  let entityNamesAsc: string[] = [];
  let entityNamesDesc: string[] = [];
  before(() => {
    cy.visit("/");
    cy.contains(Application.title);
    cy.loginAsTestUserWithRoles("hub-central-flow-writer", "hub-central-match-merge-writer", "hub-central-mapping-writer", "hub-central-load-writer", "hub-central-entity-model-reader", "hub-central-entity-model-writer", "hub-central-saved-query-user").withRequest();
    LoginPage.postLogin();
    //Setup hubCentral config for testing
    cy.setupHubCentralConfig();
  });
  beforeEach(() => {
    cy.loginAsTestUserWithRoles("hub-central-flow-writer", "hub-central-match-merge-writer", "hub-central-mapping-writer", "hub-central-load-writer", "hub-central-entity-model-reader", "hub-central-entity-model-writer", "hub-central-saved-query-user").withRequest();
    cy.waitForAsyncRequest();
  });
  afterEach(() => {
    cy.resetTestUser();
    cy.waitForAsyncRequest();
  });
  after(() => {
    cy.resetTestUser();
    cy.waitForAsyncRequest();
  });

  it("Go to load tile, switch to list view, sort, and then visit another tile. When returning to load tile the list view is persisted", {defaultCommandTimeout: 120000}, () => {
    cy.waitUntil(() => toolbar.getLoadToolbarIcon()).click();
    cy.waitUntil(() => toolbar.getRunToolbarIcon()).click();
    cy.waitUntil(() => toolbar.getLoadToolbarIcon()).click();
    loadPage.loadView("table").click();
    loadPage.addNewButton("list").should("be.visible");
    cy.waitUntil(() => cy.findByTestId("loadTableName").click());
    cy.get("[aria-label=\"icon: caret-up\"]").should("have.attr", "class").and("match", /hc-table_activeCaret/);
  });

  it("Go to model tile, expand entity and property tables, and then visit another tile. When returning to the model tile, the expanded rows are persisted.", () => {
    cy.waitUntil(() => toolbar.getModelToolbarIcon()).click();
    cy.log("Table view");
    modelPage.selectView("table");
    entityTypeTable.getExpandEntityIcon("Customer");
    cy.waitUntil(() => toolbar.getRunToolbarIcon()).click();
    cy.get("body")
      .then(($body) => {
        if ($body.find("[aria-label=\"confirm-navigationWarn-yes\"]").length) {
          confirmationModal.getYesButton(ConfirmationType.NavigationWarn);
        }
      });
    cy.waitUntil(() => toolbar.getModelToolbarIcon()).click();
    modelPage.selectView("table");
    cy.findByTestId("shipping-shipping-span").should("exist");
    cy.waitUntil(() => toolbar.getRunToolbarIcon()).click();
    cy.get("body")
      .then(($body) => {
        if ($body.find("[aria-label=\"confirm-navigationWarn-yes\"]").length) {
          confirmationModal.getYesButton(ConfirmationType.NavigationWarn);
        }
      });
    cy.waitUntil(() => toolbar.getModelToolbarIcon()).click();
    modelPage.selectView("table");
    cy.findByTestId("shipping-shipping-span").should("exist");

    cy.log("Graph view");
    modelPage.selectView("project-diagram");
    modelPage.scrollPageBottom();
    cy.wait(500);
    graphVis.getPositionsOfNodes("Customer").then((nodePositions: any) => {
      let customerCoordinates: any = nodePositions["Customer"];
      graphVis.getGraphVisCanvas().trigger("mouseover", customerCoordinates.x, customerCoordinates.y);
      graphVis.getGraphVisCanvas().click(customerCoordinates.x, customerCoordinates.y);
    });

    cy.log("Check the open tab is persistent");
    graphViewSidePanel.getEntityTypeTab().click();
    graphViewSidePanel.getEntityTypeTabContent().should("exist");

    cy.log("Visit run tile and come back to model");
    cy.waitUntil(() => toolbar.getRunToolbarIcon()).click();
    cy.get("body")
      .then(($body) => {
        if ($body.find("[aria-label=\"confirm-navigationWarn-yes\"]").length) {
          confirmationModal.getYesButton(ConfirmationType.NavigationWarn);
        }
      });
    cy.waitUntil(() => toolbar.getModelToolbarIcon()).click();
    graphViewSidePanel.getEntityTypeTabContent().should("exist");

    graphViewSidePanel.getPropertiesTab().click();
    propertyTable.getExpandIcon("shipping").scrollIntoView().click();

    cy.log("Verify property has expanded");
    propertyTable.getProperty("shipping-street").scrollIntoView();
    propertyTable.getProperty("shipping-city").scrollIntoView();

    cy.log("Visit run tile and come back to model");
    cy.waitUntil(() => toolbar.getRunToolbarIcon()).click();
    cy.get("body")
      .then(($body) => {
        if ($body.find("[aria-label=\"confirm-navigationWarn-yes\"]").length) {
          confirmationModal.getYesButton(ConfirmationType.NavigationWarn);
        }
      });
    cy.waitUntil(() => toolbar.getModelToolbarIcon()).click();

    cy.log("Verify property is still expanded");
    propertyTable.getProperty("shipping-street").scrollIntoView();
    propertyTable.getProperty("shipping-city").scrollIntoView();

  });

  it("Go to run tile, expand flows and then visit another tile. When returning to the rrun tile, the expanded flows are persisted.", () => {
    // "Switch to run view, expand flows, and then visit another tile. When returning to run tile, the expanded flows are persisted."
    cy.waitUntil(() => toolbar.getRunToolbarIcon()).click();
    cy.get("body")
      .then(($body) => {
        if ($body.find("[aria-label=\"confirm-navigationWarn-yes\"]").length) {
          confirmationModal.getYesButton(ConfirmationType.NavigationWarn);
        }
      });
    cy.get("#personJSON .accordion-collapse").should("have.class", "accordion-collapse collapse");
    cy.get("#personJSON .accordion-button").click();
    cy.waitUntil(() => toolbar.getLoadToolbarIcon()).click();
    cy.waitUntil(() => toolbar.getRunToolbarIcon()).click();
    cy.get("#personJSON .accordion-collapse").should("have.class", "accordion-collapse collapse show");
  });
  it("Should sort table by entityName asc and desc", () => {
    cy.waitUntil(() => toolbar.getModelToolbarIcon()).click();
    modelPage.selectView("table");
    entityTypeTable.getExpandEntityIcon("Customer");

    modelPage.getSortIndicator().scrollIntoView().click();
    modelPage.getEntityLabelNames().then(($els) => {
      return (
        Cypress.$.makeArray($els)
          .map((el) => entityNamesAsc.push(el.innerText.toString()))
      );
    });

    modelPage.getSortIndicator().scrollIntoView().click();
    modelPage.getEntityLabelNames().then(($els) => {
      return (
        Cypress.$.makeArray($els)
          .map((el) => entityNamesDesc.push(el.innerText.toString()))
      );
    });
  });
  it("Validate that the table records on shown in the UI are sorted asc", () => {
    expect(JSON.stringify(entityNamesAsc)).equal(JSON.stringify(entityNamesAsc.sort()));
  });
  it("Validate that the table records on shown in the UI are sorted desc", () => {
    expect(JSON.stringify(entityNamesDesc)).equal(JSON.stringify(entityNamesAsc.reverse()));
  });

  // Persistence of mapping step details is disabled temporarily. DHFPROD-7466
  // it("Switch to curate tile, go to Mapping step details, and then visit another tile. When returning to curate tile, the step details view is persisted", () => {
  //   cy.waitUntil(() => toolbar.getCurateToolbarIcon()).click();
  //   cy.waitUntil(() => curatePage.getEntityTypePanel("Person").should("be.visible"));
  //   curatePage.toggleEntityTypeId("Person");
  //   curatePage.openStepDetails("mapPersonJSON");
  //   cy.contains("Entity Type: Person");
  //   cy.waitUntil(() => toolbar.getLoadToolbarIcon()).click();
  //   cy.waitUntil(() => toolbar.getCurateToolbarIcon()).click();
  //   cy.contains("Entity Type: Person");
  //   cy.findByTestId("arrow-left").click();
  // });

  it.skip("Switch to curate tile, go to Matching step details, and then visit another tile. When returning to curate tile, the step details view is persisted", () => {
    cy.waitUntil(() => toolbar.getCurateToolbarIcon()).click();
    cy.waitUntil(() => curatePage.getEntityTypePanel("Person").should("be.visible"));
    curatePage.toggleEntityTypeId("Person");
    curatePage.selectMatchTab("Person");
    curatePage.openStepDetails("match-person");
    cy.contains("The Matching step defines the criteria for comparing documents, as well as the actions to take based on the degree of similarity, which is measured as weights.");
    cy.waitUntil(() => toolbar.getLoadToolbarIcon()).click();
    cy.waitUntil(() => toolbar.getCurateToolbarIcon()).click();
    cy.contains("The Matching step defines the criteria for comparing documents, as well as the actions to take based on the degree of similarity, which is measured as weights.");
    cy.findByTestId("arrow-left").click();
  });

  it.skip("Switch to curate tile, go to Merging step details, and then visit another tile. When returning to curate tile, the step details view is persisted", () => {
    cy.waitUntil(() => toolbar.getCurateToolbarIcon()).click();
    cy.waitUntil(() => curatePage.getEntityTypePanel("Customer").should("be.visible"));
    curatePage.toggleEntityTypeId("Person");
    curatePage.selectMergeTab("Person");
    curatePage.openStepDetails("merge-person");
    cy.contains("The Merging step defines how to combine documents that the Matching step identified as similar.");
    cy.waitUntil(() => toolbar.getLoadToolbarIcon()).click();
    cy.waitUntil(() => toolbar.getCurateToolbarIcon()).click();
    cy.contains("The Merging step defines how to combine documents that the Matching step identified as similar.");
    cy.findByTestId("arrow-left").click();
  });
});
