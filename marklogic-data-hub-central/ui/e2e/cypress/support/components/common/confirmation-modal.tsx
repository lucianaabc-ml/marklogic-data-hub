import {ConfirmationType} from "../../types/modeling-types";

class ConfirmationModal {
  getNoButton(type: ConfirmationType) {
    return cy.findByLabelText(`confirm-${type}-no`);
  }
  getCloseButton(type: ConfirmationType) {
    return cy.findByLabelText(`confirm-${type}-close`);
  }
  getYesButton(type: ConfirmationType) {
    cy.findByLabelText(`confirm-${type}-yes`).click();
  }
  getToggleStepsButton() {
    return cy.findByLabelText("toggle-steps");
  }
  getSaveEntityText() {
    return cy.findByLabelText("save-text", {timeout: 20000});
  }
  getSaveAllEntityText() {
    return cy.findByLabelText("save-all-text", {timeout: 30000});
  }
  getDeleteEntityText() {
    return cy.findByLabelText("delete-text", {timeout: 20000});
  }
  getDeleteEntityRelationshipText() {
    return cy.findByLabelText("delete-relationship-text", {timeout: 30000});
  }
  getDeleteEntityRelationshipEditText() {
    return cy.findByLabelText("delete-relationship-edit-text", {timeout: 30000});
  }
  getDeleteEntityNoRelationshipEditText() {
    return cy.findByLabelText("delete-no-relationship-edit-text", {timeout: 30000});
  }
  getDeleteEntityStepText() {
    return cy.findByLabelText("delete-step-text", {timeout: 30000});
  }
  getDeletePropertyWarnText() {
    return cy.findByLabelText("delete-property-text");
  }
  getDeletePropertyStepWarnText() {
    return cy.findByLabelText("delete-property-step-text");
  }
  getNavigationWarnText() {
    return cy.findByLabelText("navigation-warn-text");
  }
  getIdentifierText() {
    return cy.findByLabelText("identifier-text");
  }
  getDiscardChangesText() {
    return cy.findByLabelText("discard-changes-text");
  }
  getCloseConfirmationModelIcon() {
    return cy.findByLabelText("icon: close");
  }
  deleteRelationship() {
    return cy.findByTestId("delete-relationship").click();
  }
}

const confirmationModal = new ConfirmationModal();

export default confirmationModal;
