import React, {useEffect, useState, useContext} from "react";
import {Form, Icon, Input, Modal} from "antd";
import {MLButton} from "@marklogic/design-system";
import styles from "./structured-type-modal.module.scss";

import {ModelingContext} from "../../../util/modeling-context";
import {ModelingTooltips} from "../../../config/tooltips.config";
import {MLTooltip} from "@marklogic/design-system";


type Props = {
  isVisible: boolean;
  entityDefinitionsArray: any[];
  toggleModal: (isVisible: boolean) => void;
  updateStructuredTypesAndHideModal: (entityName: string) => void;
};

const StructuredTypeModal: React.FC<Props> = (props) => {
  const NAME_REGEX = new RegExp("^[A-Za-z][A-Za-z0-9_-]*$");
  const layout = {
    labelCol: {span: 6},
    wrapperCol: {span: 18},
  };

  const {modelingOptions} = useContext(ModelingContext);

  const [name, setName] = useState("");
  const [, toggleIsNameDisabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setName("");
    setErrorMessage("");
  }, [props.isVisible]);

  const handleChange = (event) => {
    if (event.target.id === "structured-name") {
      if (event.target.value === "") {
        toggleIsNameDisabled(true);
      } else {
        toggleIsNameDisabled(false);
        setErrorMessage("");
      }
      setName(event.target.value);
    }
  };

  const getErrorMessage = () => {
    if (errorMessage === "exists-structured-type") {
      return <span data-testid="same-name-structured-error">A structured type is already using the name <b>{name}</b>.
A structured type cannot use the same name as an existing structured type.</span>;
    } else if (errorMessage === "exists-property") {
      return <span data-testid="same-name-property-error">A property is already using the name <b>{name}</b>.
            A structured type cannot use the same name as an existing property.</span>;
    }
    return errorMessage;
  };

  const onSubmit = (event) => {
    event.preventDefault();
    let entityDefinitionNamesArray = props.entityDefinitionsArray.map(entity => { return entity.name; });

    if (!NAME_REGEX.test(name)) {
      setErrorMessage(ModelingTooltips.nameRegex);
    } else if (entityDefinitionNamesArray.includes(name)) {
      setErrorMessage("exists-structured-type");
    } else if (modelingOptions.entityPropertiesNamesArray.includes(name)) {
      setErrorMessage("exists-property");
    } else {
      props.updateStructuredTypesAndHideModal(name);
      props.toggleModal(false);
    }
  };

  const onCancel = () => {
    props.toggleModal(false);
  };

  const modalFooter = <div className={styles.modalFooter}>
    <MLButton
      aria-label="structured-type-modal-cancel"
      size="default"
      onClick={onCancel}
    >Cancel</MLButton>
    <MLButton
      aria-label="structured-type-modal-submit"
      form="pstructured-type-form"
      type="primary"
      htmlType="submit"
      size="default"
      onClick={onSubmit}
    >Add</MLButton>
  </div>;

  return (
    <Modal
      className={styles.modal}
      visible={props.isVisible}
      closable={true}
      title={"Add New Structured Property Type"}
      maskClosable={false}
      onCancel={onCancel}
      footer={modalFooter}
    >
      <Form
        {...layout}
        id="structured-type-form"
        onSubmit={onSubmit}
      >
        <Form.Item
          className={styles.formItem}
          label={<span>
            Name:&nbsp;<span className={styles.asterisk}>*</span>
            &nbsp;
          </span>}
          colon={false}
          labelAlign="left"
          validateStatus={errorMessage ? "error" : ""}
          help={getErrorMessage()}
        >
          <Input
            id="structured-name"
            placeholder="Enter name"
            aria-label="structured-input-name"
            className={styles.input}
            value={name}
            onChange={handleChange}
            onBlur={handleChange}
          />
          <MLTooltip title={ModelingTooltips.nameRegex}>
            <Icon type="question-circle" className={styles.icon} theme="filled" />
          </MLTooltip>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default StructuredTypeModal;
