import React from "react";
import {Modal} from "react-bootstrap";
import {HCButton} from "@components/common";
import {ExclamationTriangle, BoxArrowUpRight}  from "react-bootstrap-icons";
import styles from "./warning-modal.module.scss";

interface Props {
  toggleModal: (isVisible: boolean) => void;
  entityName?: string;
  isVisible?: boolean;
  handleTableView: () => void;
}



const WarningModal: React.FC<Props> = ({toggleModal, entityName, isVisible, handleTableView}) => {

  const onCancel = () => {
    toggleModal(false)
  }

  return(
    <Modal
      show={isVisible}
      centered
    >
      <Modal.Header className={"bb-none"}>
        <button type="button" className="btn-close" aria-label="Close" onClick={onCancel}></button>
      </Modal.Header>
      <Modal.Body className="p-4">
        <div>
          <div className={styles.content}>
            <ExclamationTriangle />
            <div>
              <p>
                This group of <b>{entityName}</b> records cannot be fully expanded. Expanding this group will exceed the maximum threshold the graph can display.
              </p>
              <p>
                To view these records, open related <b>{entityName}</b> records in Table view. The Table view will open in a new browser tab.
              </p>
            </div>
          </div>
          <div className={styles.footer}> 
            <HCButton variant="primary" aria-label="property-modal-cancel" onClick={handleTableView}>
              <BoxArrowUpRight/> View related orders in table 
            </HCButton>
            <HCButton variant="outline-light" aria-label="warning-modal-cancel" onClick={onCancel}>
              Cancel
            </HCButton>
          </div>
        </div> 
      </Modal.Body>
    </Modal>
  )
}

export default WarningModal;