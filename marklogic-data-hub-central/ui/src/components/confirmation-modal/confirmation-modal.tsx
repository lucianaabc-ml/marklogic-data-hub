import React, {useState, useEffect} from "react";
import {Modal} from "antd";
import {MLAlert, MLButton} from "@marklogic/design-system";
import styles from "./confirmation-modal.module.scss";
import {ModelingMessages} from "../../config/tooltips.config";
import {ConfirmationType} from "../../types/common-types";

type Props = {
  isVisible: boolean;
  type: ConfirmationType;
  boldTextArray: string[];
  arrayValues?: string[];
  toggleModal: (isVisible: boolean) => void;
  confirmAction: () => void;
};

const ConfirmationModal: React.FC<Props> = (props) => {
  const [showSteps, toggleSteps] = useState(false);
  const [showEntities, toggleEntities] = useState(false);
  const [loading, toggleLoading] = useState(false);

  useEffect(() => {
    if (props.isVisible) {
      toggleSteps(false);
      toggleEntities(false);
      toggleLoading(false);
    }
  }, [props.isVisible]);

  const closeModal = () => {
    if (!loading) {
      props.toggleModal(false);
    }
  };

  const renderArrayValues = props.arrayValues?.map((item, index) => <li key={item + index}>{item}</li>);

  const modalFooter = <div className={styles.modalFooter}>
    <MLButton
      aria-label={`confirm-${props.type}-no`}
      size="default"
      onClick={closeModal}
    >No</MLButton>
    <MLButton
      aria-label={`confirm-${props.type}-yes`}
      type="primary"
      size="default"
      loading={loading}
      onClick={() => {
        switch (props.type) {
        // non async confirm types
        case ConfirmationType.NavigationWarn:
        case ConfirmationType.DiscardChanges:
          break;
        default:
          toggleLoading(true);
          break;
        }
        props.confirmAction();
      }}
    >Yes</MLButton>
  </div>;

  const modalFooterClose = <MLButton
    aria-label={`confirm-${props.type}-close`}
    type="primary"
    size="default"
    onClick={closeModal}
  >Close</MLButton>;

  return (
    <Modal
      visible={props.isVisible}
      destroyOnClose={true}
      closable={true}
      className={styles.confirmModal}
      onCancel={closeModal}
      maskClosable={false}
      footer={(props.type === ConfirmationType.DeleteEntityStepWarn
          || props.type === ConfirmationType.DeleteEntityWithForeignKeyReferences
          || props.type === ConfirmationType.DeleteEntityPropertyWithForeignKeyReferences) ? modalFooterClose : modalFooter}
    >
      <div className={styles.modalBody}>
        {props.type === ConfirmationType.Identifer && (
          <>
            <p aria-label="identifier-text">Each entity type is allowed a maximum of one identifier. The current identifier is <b>{props.boldTextArray[0]}</b>.
            Choosing a different identifier could affect custom applications and other code that uses <b>{props.boldTextArray[0]}</b> for searching.</p>

            <p>Are you sure you want to change the identifier from <b>{props.boldTextArray[0]}</b> to <b>{props.boldTextArray[1]}</b>?</p>
          </>
        )}

        {props.type === ConfirmationType.DeleteEntity && <p aria-label="delete-text">Permanently delete <b>{props.boldTextArray[0]}</b>?</p>}

        {props.type === ConfirmationType.DeleteEntityRelationshipWarn && (
          <>
            <MLAlert
              className={styles.alert}
              closable={false}
              description={"Existing entity type relationships."}
              showIcon
              type="warning"
            />
            <p aria-label="delete-relationship-text">The <b>{props.boldTextArray[0]}</b> entity type is related to one or more entity types. Deleting <b>{props.boldTextArray[0]}</b> will cause
            those relationships to be removed from all involved entity types.</p>
            <p>Are you sure you want to delete the <b>{props.boldTextArray[0]}</b> entity type?</p>
          </>
        )}

        {/* {props.type === ConfirmationType.DeleteEntityRelationshipOutstandingEditWarn && (
          <>
            <MLAlert
              className={styles.alert}
              closable={false}
              description={"There are existing entity type relationships, and outstanding edits that need to be saved."}
              showIcon
              type="warning"
            />
            <p aria-label="delete-relationship-edit-text">The <b>{props.boldTextArray[0]}</b> entity type is related to one or
              more entity types. Deleting <b>{props.boldTextArray[0]}</b> will cause
              those relationships to be removed from all involved entity types.</p>
            <p>Also, before you can delete the <b>{props.boldTextArray[0]}</b> entity type, all changes to other entity
              types must be saved first, in order to make changes to the whole entity model. This may include updating
              indexes. Changes to the following entity types will be saved if you continue:</p>
            <ul className={styles.stepList}>
              {renderArrayValues}
            </ul>
            <p>OK to save these entity type changes before proceeding with deleting <b>{props.boldTextArray[0]}</b>?</p>
          </>
        )} */}

        {props.type === ConfirmationType.DeleteEntityStepWarn && (
          <>
            <MLAlert
              className={styles.alert}
              closable={false}
              description={"Entity type is used in one or more steps."}
              showIcon
              type="warning"
            />
            <p aria-label="delete-step-text">Edit these steps and choose a different entity type before deleting <b>{props.boldTextArray[0]}</b>, to correlate with your changes to this property.</p>
            <p
              aria-label="toggle-steps"
              className={styles.toggleSteps}
              onClick={() => toggleSteps(!showSteps)}
            >{showSteps ? "Hide Steps..." : "Show Steps..."}</p>

            {showSteps && (
              <ul className={styles.stepList}>
                {renderArrayValues}
              </ul>
            )}
          </>
        )}
        {props.type === ConfirmationType.DeleteEntityWithForeignKeyReferences && (
          <>
            <MLAlert
              className={styles.alert}
              closable={false}
              description={"Entity type appears in foreign key relationship in 1 or more other entity types."}
              showIcon
              type="warning"
            />
            <p aria-label="delete-entity-foreign-key-text">Edit the foreign key relationship of these entity types before deleting <b>{props.boldTextArray[0]}</b>.</p>
            <p
              aria-label="toggle-entities"
              className={styles.toggleSteps}
              onClick={() => toggleEntities(!showEntities)}
            >{showEntities ? "Hide Entities in foreign key relationship..." : "Show Entities in foreign key relationship..."}</p>

            {showEntities && (
              <ul className={styles.stepList} data-testid="entitiesWithForeignKeyReferences">
                {renderArrayValues}
              </ul>
            )}
          </>
        )}

        {props.type === ConfirmationType.DeletePropertyWarn &&
          <p aria-label="delete-property-text"
          >Are you sure you want to delete the <b>{props.boldTextArray[0]}</b> property?</p>
        }

        {props.type === ConfirmationType.DeleteEntityPropertyWithForeignKeyReferences && (
          <>
            <MLAlert
              className={styles.alert}
              closable={false}
              description={"Deleting this property may affect some entities."}
              showIcon
              type="warning"
            />
            <p aria-label="delete-property-foreign-key-text">The property <b>{props.boldTextArray[0]}</b> appears in foreign key relationships in one or more other entity types.</p>
            <p
              aria-label="toggle-entities"
              className={styles.toggleSteps}
              onClick={() => toggleEntities(!showEntities)}
            >{showEntities ? "Hide Entities..." : "Show Entities..."}</p>

            {showEntities && (
              <ul className={styles.stepList} data-testid="entityPropertyWithForeignKeyReferences">
                {renderArrayValues}
              </ul>
            )}
            <p>Edit the foreign key relationships of these entity types before deleting this property.</p>
          </>
        )}

        {props.type === ConfirmationType.DeletePropertyStepWarn && (
          <>
            <MLAlert
              className={styles.alert}
              closable={false}
              description={"Deleting this property may affect some steps."}
              showIcon
              type="warning"
            />
            <p aria-label="delete-property-step-text">The <b>{props.boldTextArray[1]}</b> entity type is used in one or more steps,
            so deleting this property may require editing the steps to make sure this deletion doesn't affect those steps.</p>
            <p
              aria-label="toggle-steps"
              className={styles.toggleSteps}
              onClick={() => toggleSteps(!showSteps)}
            >{showSteps ? "Hide Steps..." : "Show Steps..."}</p>

            {showSteps && (
              <ul className={styles.stepList}>
                {renderArrayValues}
              </ul>
            )}
            <p>Are you sure you want to delete the <b>{props.boldTextArray[0]}</b> property?</p>
          </>
        )}

        {/* {props.type === ConfirmationType.SaveEntity && (
          <>
            <p aria-label="save-text">Are you sure you want to save changes to <b>{props.boldTextArray[0]}</b>?</p>
            <p>{ModelingTooltips.saveEntityConfirm}</p>
          </>
        )} */}

        {(props.type === ConfirmationType.PublishAll) && (
          <>
            <p aria-label="save-all-text">Are you sure you want to publish your changes to the entity model?</p>
            <p>{ModelingMessages.saveEntityConfirm}</p>
          </>
        )}

        {props.type === ConfirmationType.NavigationWarn && (
          <>
            <MLAlert
              className={styles.alert}
              closable={false}
              description={"Unpublished Changes"}
              showIcon
              type="warning"
            />
            <p aria-label="navigation-warn-text">You have made changes to the properties of one or more entity types.
            If you leave the screen without publishing your changes, they will not be available in the rest of Hub Central.
            </p>

            <p>Are you sure you want to leave the Model screen?</p>
          </>
        )}

        {props.type === ConfirmationType.DeleteStep &&
          <p aria-label="delete-step-text"
          >Are you sure you want to delete the <b>{props.boldTextArray[0]}</b> step?</p>
        }

        {/**
          * Confirmation message for adding a step to a flow
          * @param props.boldTextArray[0] = step name
          * @example 'order-ingest'
          * @param props.boldTextArray[1] = flow name
          * @example 'order-flow'
        **/}
        {props.type === ConfirmationType.AddStepToFlow &&
          <p aria-label="add-step-to-flow-text"
          >Are you sure you want to add <b>{props.boldTextArray[0]}</b> to flow <b>{props.boldTextArray[1]}</b>?
          </p>
        }

        {props.type === ConfirmationType.DiscardChanges &&
          <p aria-label="discard-changes-text">Discard Changes?</p>
        }
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
