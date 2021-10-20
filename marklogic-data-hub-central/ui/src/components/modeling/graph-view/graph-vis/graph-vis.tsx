import React, {useState, useEffect, useContext, useLayoutEffect, useCallback} from "react";
import Graph from "react-graph-vis";
import "./graph-vis.scss";
import {ModelingContext} from "../../../../util/modeling-context";
import ReactDOMServer from "react-dom/server";
import {faFileExport} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import NodeSvg from "./node-svg";
import graphConfig from "../../../../config/graph-vis.config";
import AddEditRelationship from "../relationship-modal/add-edit-relationship";
import {Dropdown, Menu} from "antd";
import {defaultHubCentralConfig} from "../../../../config/modeling.config";
import * as _ from "lodash";

type Props = {
  entityTypes: any;
  handleEntitySelection: any;
  filteredEntityTypes: any;
  entitySelected: any;
  isEntitySelected: boolean;
  updateSavedEntity: any;
  toggleRelationshipModal: any;
  relationshipModalVisible: any;
  canReadEntityModel: any;
  canWriteEntityModel: any;
  graphEditMode: any;
  setGraphEditMode: any;
  setCoordsChanged: any;
  hubCentralConfig: any;
  updateHubCentralConfig: (hubCentralConfig: any) => void;
  getColor: any;
  splitPaneResized: any;
  setSplitPaneResized: any;
};

let entityMetadata = {};
// TODO temp hardcoded node data, remove when retrieved from db
// entityMetadata = graphConfig.sampleMetadata;

const GraphVis: React.FC<Props> = (props) => {

  const graphType = "shape";

  const {modelingOptions, setSelectedEntity} = useContext(ModelingContext);

  const entitiesConfigExist = () => {
    return !props.hubCentralConfig?.modeling?.entities ? false : true;
  };

  const coordinatesExist = () => {
    let coordsExist = false;
    if (entitiesConfigExist()) {
      let allEntityCoordinates = props.hubCentralConfig["modeling"]["entities"];
      for (const entity of Object.keys(allEntityCoordinates)) {
        if (allEntityCoordinates[entity]) {
          if (allEntityCoordinates[entity].graphX && allEntityCoordinates[entity].graphY) {
            coordsExist = true;
            break;
          }
        }
      }
    }
    return coordsExist;
  };
  const [physicsEnabled, setPhysicsEnabled] = useState(!coordinatesExist());
  const [graphData, setGraphData] = useState({nodes: [], edges: []});
  let testingMode = true; // Should be used further to handle testing only in non-production environment
  const [openRelationshipModal, setOpenRelationshipModal] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<any>({});
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [clickedNode, setClickedNode] = useState(undefined);
  const [newRelationship, setNewRelationship] = useState(false);
  const [escKeyPressed, setEscKeyPressed] = useState(false);
  //const [saveAllCoords, setSaveAllCoords] = useState(false);
  const [coordsLoaded, setCoordsLoaded] = useState(false);
  const [coords, setCoords] = useState<any>({});
  const [hasStabilized, setHasStabilized] = useState(false);

  // Get network instance on init
  const [network, setNetwork] = useState<any>(null);
  const initNetworkInstance = (networkInstance) => {
    setNetwork(networkInstance);
  };
  const vis = require("vis-network/standalone/umd/vis-network"); //eslint-disable-line @typescript-eslint/no-unused-vars

  // Load coords *once* on init
  useEffect(() => {
    if (!coordsLoaded && entitiesConfigExist()) {
      let newCoords = {};
      if (entitiesConfigExist()) {
        let allCoordinates = props.hubCentralConfig["modeling"]["entities"];

        Object.keys(allCoordinates).forEach(entity => {
          let entityCoordinates = allCoordinates[entity];
          if (entityCoordinates.graphX && entityCoordinates.graphY) {
            newCoords[entity] = {graphX: entityCoordinates.graphX, graphY: entityCoordinates.graphY};
          }
        });
      }
      setCoords(newCoords);
      setCoordsLoaded(true);
    } else {
      setGraphData({
        nodes: getNodes(),
        edges: getEdges()
      });
    }
  }, [props.hubCentralConfig]);

  useEffect(() => {
    if (modelingOptions.view === "graph") {
      if (network && coordsLoaded) {
        initializeScaleAndViewPosition();
      }
    }
  }, [network, modelingOptions.view]);

  // Initialize or update graph
  useEffect(() => {
    if (props.entityTypes) {
      if (coordinatesExist()) {
        if (physicsEnabled) {
          setPhysicsEnabled(false);
        }
      }

      setGraphData({
        nodes: getNodes(),
        edges: getEdges()
      });

      //Initialize graph zoom scale and view position
      if (network) {
        initializeScaleAndViewPosition();
      }
      //setSaveAllCoords(true);
      return () => {
        setClickedNode(undefined);
        setContextMenuVisible(false);
      };
    }
  }, [props.entityTypes, props.filteredEntityTypes.length, coordsLoaded]);

  useEffect(() => {
    if (props.splitPaneResized) {
      setGraphData({
        nodes: getNodes(),
        edges: getEdges()
      });
      props.setSplitPaneResized(false);
    }
  }, [props.splitPaneResized]);

  const initializeScaleAndViewPosition = () => {
    if (props.hubCentralConfig?.modeling) {
      let model = props.hubCentralConfig.modeling;
      let moveToConfig = {};
      if (model.scale) {
        moveToConfig["scale"] = model.scale;
      }
      if (model.viewPosition && Object.keys(model.viewPosition).length) {
        moveToConfig["position"] = model.viewPosition;
      }
      network.moveTo(moveToConfig);
    }
  };

  const coordsExist = (entityName) => {
    let result = false;
    if (entitiesConfigExist()) {
      let entities = props.hubCentralConfig["modeling"]["entities"];
      if (entities[entityName]) {
        if (entities[entityName].graphX &&
          entities[entityName].graphY) {
          result = true;
        }
      }
    }
    return result;
  };

  const selectedEntityExists = () => {
    return props.entityTypes.some(e => e.entityName === modelingOptions.selectedEntity);
  };

  const saveUnsavedCoords = async () => {
    if (props.entityTypes) {
      let newCoords = {...coords};
      let updatedHubCentralConfig: any = defaultHubCentralConfig;
      props.entityTypes.forEach(ent => {
        if (!coordsExist(ent.entityName)) {
          let positions = network.getPositions([ent.entityName])[ent.entityName];
          newCoords[ent.entityName] = {graphX: positions.x, graphY: positions.y};
          updatedHubCentralConfig["modeling"]["entities"][ent.entityName] = {graphX: positions.x, graphY: positions.y};
        }
      });
      setCoords(newCoords);
      if (props.updateHubCentralConfig && Object.keys(updatedHubCentralConfig["modeling"]["entities"]).length) {
        await props.updateHubCentralConfig(updatedHubCentralConfig);
        props.setCoordsChanged(true);
      }
    }
  };

  const escFunction = useCallback((event) => {
    if (event.keyCode === 27) {
      //Detect when esc is pressed, set state to disable edit mode
      setEscKeyPressed(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", escFunction, false);

    return () => {
      document.removeEventListener("keydown", escFunction, false);
    };
  }, []);

  useEffect(() => {
  //turn off edit mode on escape keydown
    if (network && props.graphEditMode) {
      network.disableEditMode();
      props.setGraphEditMode(false);
    }
    setEscKeyPressed(false);
  }, [escKeyPressed]);

  //turn on edit mode
  useEffect(() => {
    if (props.graphEditMode) {
      network.addEdgeMode();
      // setPhysicsEnabled(false);
    }
  }, [props.graphEditMode]);

  //turn off edit mode on cancel modal
  useEffect(() => {
    if (!openRelationshipModal && props.graphEditMode) {
      network.disableEditMode();
      props.setGraphEditMode(false);
      // network.addEdgeMode();
    }
  }, [openRelationshipModal]);

  // Focus on the selected nodes in filter input
  useEffect(() => {
    if (network && props.isEntitySelected) {
      network.focus(props.entitySelected);
    }
  }, [network, props.isEntitySelected]);

  // React to node selection from outside (e.g. new node created)
  useEffect(() => {
    if (network && modelingOptions.selectedEntity) {
      // Ensure entity exists
      if (selectedEntityExists()) {
        // Persist selection and coords
        network.selectNodes([modelingOptions.selectedEntity]);
        if (entitiesConfigExist()) {
          saveUnsavedCoords();
        }
      } else {
        // Entity type not found, unset in context
        setSelectedEntity(undefined);
      }
    }
  }, [network, modelingOptions.selectedEntity]);

  useLayoutEffect(() => {
    if (testingMode && network) {
      window.graphVisApi = {
        getNodePositions: (nodeIds?: any) => { return !nodeIds ? network.getPositions() : network.getPositions(nodeIds); },
        canvasToDOM: (xCoordinate, yCoordinate) => { return network.canvasToDOM({x: xCoordinate, y: yCoordinate}); },
      };
    }
  }, [network]);

  // TODO update when icons are implemented
  const getIcon = (entityName) => {
    let icon = <FontAwesomeIcon icon={faFileExport} aria-label="node-icon" />;
    return ReactDOMServer.renderToString(icon);
  };

  const getDescription = (entityName) => {
    let entityIndex = props.entityTypes.findIndex(obj => obj.entityName === entityName);
    return props.entityTypes[entityIndex].model.definitions[entityName] ?
      props.entityTypes[entityIndex].model.definitions[entityName].description : "";
  };

  // TODO remove when num instances is retrieved from db
  const getNumInstances = (entityName) => {
    let num = -123;
    if (entityMetadata[entityName] && entityMetadata[entityName].instances) {
      num = entityMetadata[entityName].instances;
    }
    return num;
  };

  //Using the base64 URLs for the corresponding Icons(This should be saved in the database.)
  const getIcons = {
    "Customer": "data:image/png;base64,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",
    "Product": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD8AAABQCAYAAACu/a1QAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAA+JJREFUeJztnE1oXFUYhp/3TJImtQuVSjKJ2C4UQYpdqFTjpKHpIuBMKC5GcStVRBG68HdRtbu6ciMqFLIQRDCrkgQEQyE2kRKoiitFpXZhblpd1B+YtJm5n4tqYyZ3JjOZe28u3PvscvKd834Pd/7umZPIKw0/bbhPBQIA+w25Q/np85eo43KxcEc3LEncuz5qb+ZnFk/X1wIslwpvCU6tl/LDruu9h+6cm/sjqL4RBrpSKowZvIRRRPS0Mz9gwYrkH3VmOr0uDqC78P1Xgub0SMc3igOmU1fKo3vqay8dG70d7OSGQXH/au/qs+30ebV4+D6v+PicwRzwZMfiN/voM3PvOEn7639nYl/QHDPbPC56WL0+UD/cU7sxINQVsEzg2kF4xUK5hv+tpLFW57TBPhfBoqGwXBp+AfEZYndUGUFXZsdZmSg8Y8aHUeck7sp7xccOmNlkHFmJkre3cZCbBPXGkZco+ZWLw2XEI3HlJUrezJ2IMy8x8t6x0f0Sj8aZmRh5qtUo3subkhh5g4NxZyZGXtLdcWcmRh7strgTEyQfP5l8Wsnk00om3yrCtHXVv7V+d8u1O0WgvFB/YLW0absKoErXpnpRDaxNEo2u/MO/FkfG/z+wMlF4EKMUVCyf161czv33s5XLOZxeC7HPSGi4jeXkn10uFt4zbEnSA77Zq5ICd04lJryK98XyE4VJHFqpeM+BRqJrOxya7OFpl8QburWr3fwpLDiC40h4rUVP9mqfVjL5tJLJpxVnsBZrolGJNa8JTtim7+EjJu68hjhM5+IMzLlqrHnNcL50Jq4wMzvXP33hp7jytsINzZz/Gvg46iAzq0GybnYcQHf1xstm9l2UQYITg7MLF6PMaBcHsPfzpT9NXUfBvgw7wGDNjBfzs4vvh712p9x6nx+amf99oG9wzDeeN/i504XN8IEpfHdwcHYh8lMW22HDLa2mpmrAGW+i4GFMd7Kw4Mf8zMJTHXUXMen+hLfTDewkmXxayeTTSiafVjL5JGAW844SCTp1beJdmQ2Ctj6YJPYAQ51mJkZ+aGZxAXiolVpvolDq9N4DEvSw3wky+bSSyaeVTD6tZPJpJZNPK5l8Wsnk00omn1Yy+bSSyaeVTL4e3/fb+g9GQZjsWqdrNCKs/gLlu3Z3f9PpGVmhhU7mNyOs/gLl+6fm/0Z8sP2lbZVcLrKjZ2H11/A5v9ZXPYnR9tUzMN/seP7s/C/bb25rwuivofw9UxcqvirjGB/dPDraEpfBikOzX33SblPtEkZ/Lf3J59XxkXytu3YYtBfbPMfEGuj7/F+5Rc3PV9twCIXt9vcPv2FA7oJnlg0AAAAASUVORK5CYII=",
    "BabyRegistry": "data:image/png;base64,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",
    "NamespacedCustomer": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAslJREFUeJzt201rE1EUxvHn3EwivoBik7YilYq4VcT2Q4jddSG6sBYUtyJIIaJZmKZ0I4JC3VgTsAqCuLC7Fgt+Dhe6EdranXWROve4UChp3mbmOplMfX77mXv4M0MmdxKAiIgoIim8LN8TkVtQmKSHSRWBBbDgCaQCwIMkPVEa6byBwEt6jPSSLG9bRwzoiAEdMaAjBnTEgI4Y0JFR1a2kh0grVWx4JmMuW99eAa/GkMS3Rt8kPQUREaVY5F3AfG3ugqj/ECofN6fvPw16XOFt6Qh+Zh+Lyqmoa/cJq9AXkQLmq3MXDewqgGMA4P/yTm7dnPkW5NjB6uxtAM+jrNtvVHU79LPf3ngAYHL+oRCrHgy7Zr8SkcOhAg7UymN74/3vAgccqJXHMiorYLwGgQIyXntdAzJeZx0DMl53bV9p/omHVQBHezhP6rS8AnfjCeN10RRweLEyHm882Y7nvAlQ/Gi4hYcXK+PW2JU4r7xMvb7kH8ieB2Q0rjV6QVV9EbP7Vc4lnho5u3m9+PnfjpgOHgAMVmfPWcR75e1XBgAUmGa8aP4GtO9VUU96mDQyAPD9xoNPxsgkI4bXsB84VKtMWKvvRJALc5JQHyJrJa/wJXdXRFO/oQrF64bHmPWp4vJQrTIZJWJQha/ZayKYd9gM7xsKXG16kF6fKi7HeTuL4ngc502CCPItv8rFHXE/absbw4jBdNzOYsTuum6oMmJngbb0GbG9wC+VGLG1UK81GbFZ6BfrrSJ6agIHVchO2DX7l+5E/21MtXzJKGYhsroxVZyBiAY57sRSKe/Xc68gGI26dj9QqA9gIek5iIgoxaRQfXRGYCagmv4Nuh6ygM1k9IMHmDUAIxD2C8MAsL7cMQKMJD1MWongNP/e5YgBHTGgIwZ0xICOGNARAzoyUA20j0ctWQPBM0aMxKriSdJDEBEREREREfXab/N49i5mrddMAAAAAElFTkSuQmCC",
    "Order": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFYAAABQCAYAAACDD4LqAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAA1dJREFUeJzt3E9oFHcYxvHnmRnFlNCDxpKC4B+iK3uoFSKhJ6GXooK4EaSgssaC0qIWPCheGjx6lHpsMQEPYVu2oiAetNWrpRjEQ1YEiQdFsCrYgN3szNOLEZLsGiF559dd3s9xh/29L1+WSXZhl3irWPmuO02mzkk4QjKB+3DSc4FnHgyO/AxCAEAAKFa+WZkm6Q0AW4Mu2OYkXXgwOHoChCIIbCSNMXjURSN5rFAtHwMAFn4r74X4a+ilOoWgf5JGsjaCcDj0Mp2EYHeaNPYlEgfI2RcF1AkciOP4bpj1/v9SKVaafkvy+7nXJA4kJFbNf5pu1wZHf8ljwXbWd+346fjN63lhAfVEzZ5AsG69VCd4uPPHf5s9TpJNw7rF87BGPKwRD2vEwxrxsEY8rBEPa8TDGvGwRjysEQ9rxMMa8bBGPKwRD2vEwxrxsEY8rBEPa8TDGvGwRjysEQ9rxMMa8bBGPKwRD2vEwxrxsEY8rBEPa8TDGvGwRjyskRZhxeaPu1mGh1u+MFtcYH+xUu612qdTbN4yuafVtVZfRv4kTfioUC0/gSijvdqaqETA2lbX3/ct7xUAN8BvCk1xgTD+x8uIhzXiYY14WCMe1oiHNeJhjXhYIxEEf2e11KRGJOpx6D06jcjHEYDfQy/SaajsRiRF5/12sHQk1XpXrr8Wv6iMP+v5+vMYwPbQS7U7QdOMWPprx/nJGAD+Hhu/1TOx5WOAX4Rerl1JmGLEfbXSyE1g5t8tQrXB0ZNZhl0Q7gTdsM0IqAMYk/hZrTRydebxph8qFivl3iyJCpmyLsulSBwHuNPibEk/APjT4ux3M+LoZVfX9P17X12amnst6MfYheqhKoCSyeHi4dreixdNzv4A4d55CQS0zW5AZnj2woKF3VQ91A9wjdX5Ivds/2M42A8MBwtL4Kjx+Z8+fTm5y3LG+wQJ21cZWg1iv/UcQiesZ7QSJGwc6ySAFfaT+OXGy0MD9nPmyz3spitHepTjKylKNZzXrFlz8x7IRn03yY/yG4gdfZWh1bnNeyv/W0GGN/kOVDa9LJvOd2aAsN3Ll18GMJHXPIEXJkujr/KaNyPIO6/N1YOrpPiUoCI59xfCl0yd1PWJ8XU/4ezZzGiGc84559wC/gPRlNqadvfzLQAAAABJRU5ErkJggg==",
    "Others": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC4AAABQCAYAAABmkUeGAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAB8NJREFUaIHtmm9wVFcZxp/n7mb5l1GayshQaAtJNpZCm2Y3JRYBRVQ+oFVn2qLWjh0aNgliZ2yLOu2ItMw4g+jYQpMNFKxamZHaWnFspUxBwHGC2YVKM9DsJgXqUKktqFAEkux5/AAJm83d3Xt3L8EPeT6dOef985u7d8857zmX8Ei1G7qDMqYzl42gjfGG4FIv8lleBAGAVF+qLL8VHdg4k2fgw60R8OHWCPhwawTc8mFUPhtCE0OtyZpbfvH6uGLzsWDPlbJCE7vmArgT1AIKN4N0Fk+SyMMU9oB6edyokh2775963k161+C3P5n4UCqABhJNAG9w628nCWcA/AaWaY1HqvY58XEMftdW+Y6c6mqQ8DgJz1ZAG+0lzGPtDVV7chk5Ap/VcvjGFH3PAZztDZsDCVvY1/ut9uXTT9oN5wUPtXZ/AjIvEbjWe7rcEnTCgnVve0PFa5ljOWeVmuau+VDq1asBDQAEJwrm1XC0a8iOMusTr412hSWzG+TYK4vnQJL80JS2xqrj/V22T7x23aFrjfTb/wtoACDe67VK/5XeZQsuf8lTJCYPD1V+CVgZj1z33/Q+f6ZRqKVrNqivFpGlR8AhUscEnIZIUmUCyykFHS9Sl+O9WXri+DOZ3UPAAfNoYQuqfidZG0pH+3ZmWwVnNh+7JoALnyb5ZUFfJDgmX1QjPbJ71af6MvsHEYZau6+nSR119VSkt4107/6mqr2OfQDUbewo602VNFF8COT4LMH/FItUzgepzJHB77gxX3D3U6qLqZJZbqEBoK1+xql4Q9Vqv7+nHEILpCFwxlgP20EDmeDUHOfMksh72r859YRb6HS11c84FWusbJLlmyvg6OXweG5/U0U8m99gcOFmpwkF/DEeqdxfCKyd4pHyP5f4LoQE/VLQNli9K3LZD/pzkpjkNBGpXYVCZlNb/YxTAO5zYpsxj7tYcAxtNz/DpcwFqNepo4iPeMziSoPABbzvwveT3qK40yBwAkmnjgQWhluTd3iP5EyZs4qjsgkAQBIGL93e0nmr11BONPiJ0+xw5U1MSMHaW9OcWOQplaPUabpUV74NOJ8W07Qp1dv3/QPLb3rHG7TcGrK8h1qSj5JYXUgwSedBbgb1k3gk2F08XnYNAZ++vqN0jD9wiOCUwsPKQNgGS0/H3gnuxCqaYiDtZLuhCrcm5sngNZK+ojMI3SA2+2V+nl56FausO8FwNLkMwHqvEgEyErZT2CTf6W3xSNjxYmennFvYcEvyCRCPFZPATpLeJbihR1x/sKnin4XEyL33lhhu7foepNWuSy4HknSexDNIcU1sWeXf3fg6ggm1JD5D8lkUNk3ml9ALKNoXwBOvLwm+58TF8VO89WdHxvsv9K4hWF84YR5J/wbx7Vik8tlslU+/XP/8Nc2JOsvC2it6jihskTW2PvNIIl2FvbcSQ9HkAoArSCwoGDBnCsX8ft+iffXl79qNF/2HC7V2z6TMg5K+RnJ0sfHSJSgJ9s2LR6b/I3PMs5liZvOxawK+81+HrAiB6V7FhbR/3OiS2ZlnNZ5PcRdfo+47CFMv4B6PfoU1sYbK76R3eA+eprqNHWV9qZIlgvUggesKDiT0+GGm5T2t9Upt9TNOxRqqfnSu7MI0CksBHSsoEBHoIxsHdw2jpm/tCIw5GVhG8nEApe68dSwWqZzaP78PK3i/ws2d00DrDyA+5sZPtG6JR8rfAK7SzXKsqeotP8wCSbZzdDZZxtQNtL3Hcqa2xqrjFJa58RFU1d++qnf5scbKFwW85diBmNDfvLofIZAi4PjgVECgv50T/LZ1hyeFWhPlxbDlhZGLhyee629mdaqNds71+f1HYdAZjibuL5Ivu6igY1NgoFqyBZ+1sfujBvw1iJKLBTM3h1sST1U8mcj7aYcbhZs7pxGc4dReFrr620PA79oqXyqV2kJw4qABcvmHA2yr3dBZXRRtuizL1fmNRRMbaGcOHjnZ9QOA8+0cSVSbFGPhaGJd9abEBDsbpwpHOx8B8BWn9gJO3jg++MYAS/pgbTS5UMArDiOdFbDR8lkt7UvLE04BqjclJvh7sRago5uHy+kGfyU6AB5+OjlFPhwo8IODvwrm95BvF6wxBzJLrot7lNG1pFkM8BtwvU8BjGE4/TLrMng0uQeA81u3bJIk8DiA9wH1kRgP8QYQJUUE3R5rCC5M77EuJSOkmcXwDogkickkqkmGAVYUAy2gD8Z6OLPfupRMEB6QlCoC+QrJrIo1VXRk9g7MKrGm4Au0rM8LOD28YLmkl6eVBX9oNzJoOoxFKl7xi2EBfxsesBwS9gX8qcXP303bt2DIPL6vsSJZOspfJ2gtIM/PtZ1JO60effYvD9x0JptFzgoo1JqsgdF6kh/3Hs5eEn4K6z8r8h1D5y/dJIZbk4skfJfklbseFN404rL9TRU7nZi7qjnDzYnbRCwBudirL+MEdVjSj4115lduDvsLKpbnrdzl/2DS5Dk0+JygOQBqnB/8yEg8SGC7YF6MNwTb853M2smTKv/iNWPiTsB6IY/pjp6xZ7908L7qs8Xm9KR0e/5upoxh3vtNAae9gAauds1ZhEbAh1sj4MOtEXBLPH7xvjK7KB31Kp+nx8y10a6wkepsBy2eKfkgsLXtoevP2Y671P8AeAbX1FqzTtkAAAAASUVORK5CYII="
  }

  const getNodes = () => {
    let nodes;
    if (graphType === "shape") {
      nodes = props.entityTypes && props.entityTypes?.map((e) => {
        let entityName =  e.entityName;
        if (e.entityName.length > 20) {
          entityName=entityName.substring(0, 20) + "...";
        }
        let label = "";
        let tmp = {
          ...graphConfig.defaultNodeProps,
          shape: "custom",
          id: e.entityName,
          label: label.concat(
            "<b>", entityName, "</b>\n",
            // "<code>", getNumInstances(e.entityName).toString(), "</code>"
          ),
          color: {
            background: props.getColor(e.entityName),
            border: e.entityName === modelingOptions.selectedEntity && props.entitySelected ? graphConfig.nodeStyles.selectColor : props.getColor(e.entityName),
          },
          borderWidth: e.entityName === modelingOptions.selectedEntity && props.entitySelected ? 3 : 0,
          // physics: {
          //   enabled: true
          // },
          chosen: {
            node: function (values, id, selected, hovering) {
              if (selected && hovering) {
                values.color = graphConfig.nodeStyles.hoverColor;
                values.borderColor = graphConfig.nodeStyles.selectColor;
                values.borderWidth = 3;
              } else if (selected) {
                values.color = props.getColor(id);
                values.borderColor = graphConfig.nodeStyles.selectColor;
                values.borderWidth = 3;
              } else if (hovering) {
                values.color = graphConfig.nodeStyles.hoverColor;
                values.borderWidth = 0;
              }
            }
          },
          ctxRenderer: ({ ctx, x, y, state: { selected, hover }, style, label }) => {
              const r = style.size;
              const color = style.color;
              // if(network && network.getScale() > 0.7) {
              //   console.log("network.getScale()",network.getScale())
              //   displayLabel = true;
              // }
              // const radius = displayLabel ? r*2 : r;
              // const imagePositionY = displayLabel ? y-30 : y-15;
              const drawNode = () => {
                let scale = props.hubCentralConfig?.modeling?.scale ? props.hubCentralConfig?.modeling?.scale : 0.5;
                if(network) {
                    scale = network.getScale();
                  }
                //let scale = network.getScale();
                let displayLabel = scale > 0.5;
                const radius = displayLabel ? r*2 : r;
                const imagePositionY = displayLabel ? y-30 : y-15;
                  ctx.beginPath();
                  ctx.arc(x,y,radius,0,2*Math.PI);
                  ctx.fillStyle = !hover ? color: "#7FADE3";
                  ctx.fill();
                  ctx.lineWidth = 0.2;
                  if(selected){
                    ctx.strokeStyle = '#5B69AF';
                    ctx.lineWidth = 4;
                  }
                  ctx.stroke();
                  if(displayLabel) {
                    ctx.font = '20px Times New Roman';
                    ctx.fillStyle = 'Black';
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(entityName, x, y+10);
                  }
                  if(scale > 0.3) {
                    var img = new Image();   // Create new img element

                    //Can be modified to use the icons from HC Config.
                    //img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFYAAABQCAYAAACDD4LqAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAA1dJREFUeJzt3E9oFHcYxvHnmRnFlNCDxpKC4B+iK3uoFSKhJ6GXooK4EaSgssaC0qIWPCheGjx6lHpsMQEPYVu2oiAetNWrpRjEQ1YEiQdFsCrYgN3szNOLEZLsGiF559dd3s9xh/29L1+WSXZhl3irWPmuO02mzkk4QjKB+3DSc4FnHgyO/AxCAEAAKFa+WZkm6Q0AW4Mu2OYkXXgwOHoChCIIbCSNMXjURSN5rFAtHwMAFn4r74X4a+ilOoWgf5JGsjaCcDj0Mp2EYHeaNPYlEgfI2RcF1AkciOP4bpj1/v9SKVaafkvy+7nXJA4kJFbNf5pu1wZHf8ljwXbWd+346fjN63lhAfVEzZ5AsG69VCd4uPPHf5s9TpJNw7rF87BGPKwRD2vEwxrxsEY8rBEPa8TDGvGwRjysEQ9rxMMa8bBGPKwRD2vEwxrxsEY8rBEPa8TDGvGwRjysEQ9rxMMa8bBGPKwRD2vEwxrxsEY8rBEPa8TDGvGwRjyskRZhxeaPu1mGh1u+MFtcYH+xUu612qdTbN4yuafVtVZfRv4kTfioUC0/gSijvdqaqETA2lbX3/ct7xUAN8BvCk1xgTD+x8uIhzXiYY14WCMe1oiHNeJhjXhYIxEEf2e11KRGJOpx6D06jcjHEYDfQy/SaajsRiRF5/12sHQk1XpXrr8Wv6iMP+v5+vMYwPbQS7U7QdOMWPprx/nJGAD+Hhu/1TOx5WOAX4Rerl1JmGLEfbXSyE1g5t8tQrXB0ZNZhl0Q7gTdsM0IqAMYk/hZrTRydebxph8qFivl3iyJCpmyLsulSBwHuNPibEk/APjT4ux3M+LoZVfX9P17X12amnst6MfYheqhKoCSyeHi4dreixdNzv4A4d55CQS0zW5AZnj2woKF3VQ91A9wjdX5Ivds/2M42A8MBwtL4Kjx+Z8+fTm5y3LG+wQJ21cZWg1iv/UcQiesZ7QSJGwc6ySAFfaT+OXGy0MD9nPmyz3spitHepTjKylKNZzXrFlz8x7IRn03yY/yG4gdfZWh1bnNeyv/W0GGN/kOVDa9LJvOd2aAsN3Ll18GMJHXPIEXJkujr/KaNyPIO6/N1YOrpPiUoCI59xfCl0yd1PWJ8XU/4ezZzGiGc84559wC/gPRlNqadvfzLQAAAABJRU5ErkJggg=="
                    img.src = getIcons[e.entityName] ? getIcons[e.entityName] : getIcons["Others"];
                    //Drawing the image on canvas
                    ctx.drawImage(img,x-15,imagePositionY,30,28);
                  }
                  
                  let expandable = true; // Use this to display ellipsis, when node has connected relationships
                  if(expandable) {
                    var ellipsisImg = new Image();
                    ellipsisImg.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD8AAABQCAYAAACu/a1QAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAnZJREFUeJzt189LVHEUBfBzv05SIqUIhS1q3apVCGlBpgkJisoM/QdtzHKUxJWbSEGaWgVB0K5FqSC4CCenxjZFGyFqIQW1CaWg0VSIee+dNgU1Pp0fbxHh+Szvvd/D9z7eWzxARERERERERERERERERP4FA4BUx3QjfE4Q6DJYXdFTxCYNadJGhhd6l3cbvd02c4IMJgi0mVlN8Wx+A2zW8/zR69nEym6jqfapZtJuGHEahuqi2cAKgIfVeX+sP5vYsFTHdCN9vDTgWAmH/74nmDOfLcln8bdh/VsXpk/Cx6IZDpabDeCTC2JN1zLdq6HZbVMXDZgFLFZuMIlX2PTPOficqGRxADBYHZ27u+OAj3sVLg4Ax33n3QxrjMUfVYO4X8niAGCGJtRWDTgCXRVe7nfQ2fHOufrC+p3W2SNmaIqSDbA7rHoo506ZWWOUZAO6XEnfeBHV+a2GwpoXy297IOUy2LZcAAgCFzmbQIOLGvI/0/J7lZbfq7T8XrXHlyc2o4bEHNYKa+YF36PmklgPq5shcjbAdUdDOlIEuXT1SeJLYT2ZiX8G8C5KNozzYeXa/bHXwPYHXhYi7UgbIZir7DzyRg6E9QxGGK4A9CrLZg4uGA3rXZ7r2iIwWEnur/QPzquadMMLvcvms4XEYlnHySULgvPJTPzFTjPJdF/GyHaAb8rKBp4HQdA8NJ94v9PM0NO+BwF5ieTH0u8Mn+QMquzMYLYnZ382xzvn6sN+UgrFHNbCXvXdTLZPH3bmF/29dT/2fR3M9pT8JhK0VOvjo4jhwG5zfj7GmsBb7c8mNkrNFhEREREREREREREREREREZFK/QT3i+BFtIzcWAAAAABJRU5ErkJggg=="
                    ctx.fillStyle = "black";
                    ctx.globalCompositeOperation = "color";
                    ctx.drawImage(ellipsisImg,x,y+20,14,14);
                  }
              };
              ctx.save();
              ctx.restore();
              return {
                drawNode,
                nodeDimensions: { width: 3 * r, height: 3 * r },
              };
        }
        };
        if (coords[e.entityName] && coords[e.entityName].graphX && coords[e.entityName].graphY) {
          //tmp.physics.enabled = false;
          tmp.x = coords[e.entityName].graphX;
          tmp.y = coords[e.entityName].graphY;
        }
        if (e.entityName.length > 20) {
          tmp.title =  e.entityName;
        }
        if (getDescription(e.entityName) && getDescription(e.entityName).length > 0) {
          tmp.title = e.entityName.length > 20 ? tmp.title +  "\n" + getDescription(e.entityName) : getDescription(e.entityName);
        }
        return tmp;
      });
    } else if (graphType === "image") { // TODO for custom SVG node, not currently used
      nodes = props.entityTypes && props.entityTypes?.map((e) => {
        const node = new NodeSvg(e.entityName, props.getColor(e.entityName), getNumInstances(e.entityName), getIcon(e.entityName));
        let tempTitle;
        if (getDescription(e.entityName) && getDescription(e.entityName).length) {
          tempTitle = getDescription(e.entityName);
        }
        return {
          id: e.entityName,
          label: "",
          title: tempTitle,
          image: "data:image/svg+xml;charset=utf-8," + node.getSvg(),
          shape: "image"
        };
      });
    }
    return nodes;
  };

  const onChosen = (values, id, selected, hovering) => {
    if (!props.canWriteEntityModel && props.canReadEntityModel) {
      //hide interactions if edit permissinos are missing
    } else {
      values.color = "#7FADE3";

      //change one to many image
      if (values.toArrowSrc === graphConfig.customEdgeSVG.oneToMany) {
        values.toArrowSrc = graphConfig.customEdgeSVG.oneToManyHover;
      } else {
      //change one to one image
        values.toArrowSrc = graphConfig.customEdgeSVG.oneToOneHover;
      }
    }
  };

  // Handle multiple edges between nodes:
  // 1. Count how many same edges were drawn before current edge
  // 2. Check if previous edge is in same or reversed direction
  //    (so we can draw it the correct way, CW or CCW)
  const getSmoothOpts = (to, from, edges) => {
    let count = 0;
    let reversed;
    edges.forEach((edge, i) => {
      if (to === edge.to && from === edge.from) {
        count++;
        // This works so...
        reversed = (reversed === undefined) ? false : reversed;
      } else if (from === edge.to && to === edge.from) {
        count++;
        reversed = (reversed === undefined) ? true : reversed;
      }
    });
    // Space out same edges using visjs "smooth" options
    let space = 0.16;
    let type = "";
    if (!reversed) {
      type = (count % 2 === 0) ? "curvedCW" : "curvedCCW";
    } else {
      type = (count % 2 === 0) ? "curvedCCW" : "curvedCW";
    }
    return {
      enabled: (count > 0),
      type: type,
      roundness: (count % 2 === 0) ? (space * count / 2) : (space * (count + 1) / 2)
    };
  };

  const getEdges = () => {
    let edges: any = [];
    props.entityTypes.forEach((e, i) => {
      if (!e.model.definitions[e.entityName]) {
        return [];
      }

      let properties: any = Object.keys(e.model.definitions[e.entityName].properties);
      properties.forEach((p, i) => {
        let pObj = e.model.definitions[e.entityName].properties[p];
        let relationshipName =  p;
        let title = !props.canWriteEntityModel && props.canReadEntityModel ? undefined : "Edit Relationship";
        if (relationshipName.length > 20) {
          relationshipName=relationshipName.substring(0, 20) + "...";
          if (title !== undefined) title = p + "\n" + title;
        }
        //for one to one edges
        if (pObj.relatedEntityType) {
          let parts = pObj.relatedEntityType.split("/");
          edges.push({
            ...graphConfig.defaultEdgeProps,
            from: e.entityName,
            to: parts[parts.length - 1],
            label: relationshipName,
            id: e.entityName + "-" + p + "-" + parts[parts.length - 1] + "-via-" + pObj.joinPropertyName,
            title: title,
            arrows: {
              to: {
                enabled: true,
                src: graphConfig.customEdgeSVG.oneToOne,
                type: "image"
              }
            },
            arrowStrikethrough: true,
            color: "#666",
            font: {
              align: "top",
            },
            chosen: {
              label: onChosen,
              edge: onChosen,
              node: false
            },
            smooth: getSmoothOpts(e.entityName, parts[parts.length - 1], edges)
          });
        //for one to many edges
        } else if (pObj.items?.relatedEntityType) {
          let parts = pObj.items.relatedEntityType.split("/");
          edges.push({
            ...graphConfig.defaultEdgeProps,
            from: e.entityName,
            to: parts[parts.length - 1],
            label: relationshipName,
            id: e.entityName + "-" + p + "-" + parts[parts.length - 1] + "-via-" + pObj.items.joinPropertyName,
            title: title,
            arrowStrikethrough: true,
            arrows: {
              to: {
                enabled: true,
                src: graphConfig.customEdgeSVG.oneToMany,
                type: "image"
              }
            },
            color: "#666",
            font: {align: "top"},
            chosen: {
              label: onChosen,
              edge: onChosen,
              node: false
            },
            smooth: getSmoothOpts(e.entityName, parts[parts.length - 1], edges)
          });
        }
      });
    });
    return edges;
  };

  const getRelationshipInfo = (node1, node2, event) => {
    let sourceNodeName = node1;
    let targetNodeName = node2;
    let targetNodeColor;
    let edgeInfo = event && event.edges?.length > 0 ? event.edges[0] : "";
    if (node2 === "Select target entity type*") {
      targetNodeColor = "#ececec";
    } else {
      targetNodeColor = props.getColor(targetNodeName);
    }
    return {
      edgeId: edgeInfo,
      sourceNodeName: sourceNodeName,
      sourceNodeColor: props.getColor(sourceNodeName),
      targetNodeName: targetNodeName,
      targetNodeColor: targetNodeColor,
      relationshipName: edgeInfo.length > 0 ? edgeInfo.split("-")[1] : "",
      joinPropertyName: edgeInfo.length > 0 ? edgeInfo.split("-")[4] : ""
    };
  };

  const options = {
    ...graphConfig.defaultOptions,
    layout: {
      //hierarchical: true
      //randomSeed: "0.7696:1625099255200",
    },
    physics: {
      enabled: physicsEnabled,
      barnesHut: {
        springLength: 160,
        avoidOverlap: 0.4
      },
      stabilization: {
        enabled: true,
        iterations: 1,
      }
    },
    interaction: {
      navigationButtons: true,
      hover: true,
    },
    manipulation: {
      enabled: false,
      addNode: function (data, callback) {
        // filling in the popup DOM elements
      },
      editNode: function (data, callback) {
        // filling in the popup DOM elements
      },
      addEdge: function (data, callback) {
        let relationshipInfo;
        if (data.to === data.from) {  //if node is just clicked on during add edge mode, not dragged
          relationshipInfo = getRelationshipInfo(data.from, "Select target entity type*", "");
        } else { //if edge is dragged
          relationshipInfo = getRelationshipInfo(data.from, data.to, "");
        }
        setSelectedRelationship(relationshipInfo);
        setNewRelationship(true);
        setOpenRelationshipModal(true);
      }
    },
  };

  const menuClick = async (event) => {
    setContextMenuVisible(false);
    if (event.key === "1") {
      if (network) {
        await network.focus(clickedNode);
        let viewPosition: any = await network.getViewPosition();
        setClickedNode(undefined);
        let viewPositionPayload = defaultHubCentralConfig;
        viewPositionPayload.modeling["viewPosition"] =  viewPosition;
        props.updateHubCentralConfig(viewPositionPayload);
      }
    }
  };

  const menu = () => {
    return (
      <Menu id="contextMenu" onClick={menuClick}>
        { clickedNode &&
      <Menu.Item key="1" data-testid={`centerOnEntityType-${clickedNode}`}>
        Center on entity type
      </Menu.Item> }
        {/*{ clickedEdge &&
      <Menu.Item key="2">
        {"Edit relationship "}
      </Menu.Item> }
        <Menu.Item key="3"> <Link to={{ pathname: "/tiles/explore", state: {entity: clickedNode}}}>
          {"Explore " + clickedNode + " instances"}
        </Link> </Menu.Item>
      <Menu.Item key="4">3rd menu item</Menu.Item>*/}
      </Menu>
    );
  };

  useEffect(() => {
    if (clickedNode) {
      setContextMenuVisible(true);
    } else {
      setContextMenuVisible(false);
    }
  }, [clickedNode]);

  const handleZoom = _.debounce((event, scale) => {
    let ZoomScalePayload = defaultHubCentralConfig;
    ZoomScalePayload.modeling["scale"] = scale > 0 ? scale : event.scale;
    props.updateHubCentralConfig(ZoomScalePayload);
  }, 400);

  const updateConfigOnNavigation = _.debounce(async (event) => {
    let {nodes} = event;
    if (!nodes.length || modelingOptions.selectedEntity) {
      if (entitiesConfigExist()) {
        let scale: any = await network.getScale();
        let viewPosition: any = await network.getViewPosition();
        let updatedHubCentralConfig: any = defaultHubCentralConfig;
        let entitiesConfig = props.hubCentralConfig["modeling"]["entities"];
        Object.keys(entitiesConfig).forEach(entityName => {
          if (coords[entityName]) {
            updatedHubCentralConfig["modeling"]["entities"][entityName] = {graphX: coords[entityName].graphX, graphY: coords[entityName].graphY};
          }
        });
        updatedHubCentralConfig["modeling"]["scale"] = scale;
        updatedHubCentralConfig["modeling"]["viewPosition"] = viewPosition;
        if (props.updateHubCentralConfig && Object.keys(updatedHubCentralConfig["modeling"]["entities"]).length) {
          await props.updateHubCentralConfig(updatedHubCentralConfig);
          props.setCoordsChanged(true);
        }
      }
    }
  }, 400);

  const events = {
    select: (event) => {
      if (!props.graphEditMode) {
        // console.info("SELECT", event);
        let {nodes} = event;
        if (nodes.length > 0) {
          props.handleEntitySelection(nodes[0]);
        }
      }
    },
    click: (event) => {
      //if click is on an edge
      if (event.edges.length > 0 && event.nodes.length < 1 && props.canWriteEntityModel) {
        let connectedNodes = network.getConnectedNodes(event.edges[0]);
        let relationshipInfo = getRelationshipInfo(connectedNodes[0], connectedNodes[1], event);
        setNewRelationship(false);
        setSelectedRelationship(relationshipInfo);
        setOpenRelationshipModal(true);
      }
      if (clickedNode) {
        setClickedNode(undefined);
      }
    },

    dragStart: (event) => {
      if (!props.graphEditMode) {
        if (physicsEnabled) {
          setPhysicsEnabled(false);
        }
      }
    },
    dragEnd: async (event) => {
      let {nodes} = event;
      if (nodes.length > 0) {
        let positions = network.getPositions([nodes[0]])[nodes[0]];
        if (positions && positions.x && positions.y) {
          let newCoords = {...coords};
          newCoords[nodes[0]] = {graphX: positions.x, graphY: positions.y};
          setCoords(newCoords);
          let coordsPayload = defaultHubCentralConfig;
          coordsPayload.modeling.entities[nodes[0]] =  {graphX: positions.x, graphY: positions.y};
          props.updateHubCentralConfig(coordsPayload);
        }
      }
    },
    hoverNode: (event) => {
      event.event.target.style.cursor = "pointer";
    },
    blurNode: (event) => {
      event.event.target.style.cursor = "";
    },
    hoverEdge: (event) => {
      event.event.target.style.cursor = !props.canWriteEntityModel && props.canReadEntityModel ? "" : "pointer";
    },
    blurEdge: (event) => {
      event.event.target.style.cursor = "";
    },
    doubleClick: (event) => {
    },
    stabilized: (event) => {
      // NOTE if user doesn't manipulate graph on load, stabilize event
      // fires forever. This avoids reacting to infinite events
      if (hasStabilized) return;
      if (network) {
        let positions = network.getPositions();
        // When graph is stabilized, nodePositions no longer empty
        if (positions && Object.keys(positions).length && !Object.keys(coords).length) {
          saveUnsavedCoords();
          setHasStabilized(true);
          if (physicsEnabled) {
            setPhysicsEnabled(false);
            return false;
          }
        }
        if (modelingOptions.selectedEntity && selectedEntityExists()) {
          try { // Visjs might not have new entity yet, catch error
            network.selectNodes([modelingOptions.selectedEntity]);
          } catch (err) {
            console.error(err);
          }
        }
      }
    },
    oncontext: (event) => {
      let nodeId = network.getNodeAt(event.pointer.DOM);
      if (nodeId) {
        event.event.preventDefault();
        setClickedNode(nodeId);
      } else {
        setClickedNode(undefined);
      }
    },
    dragging: (event) => {
      if (clickedNode) {
        setClickedNode(undefined);
      }
    },
    zoom: async (event) => {
      let networkScale: any = await network.getScale();
      if (network) {
        if (networkScale >= graphConfig.scale.min) {
          network.moveTo({
            scale: graphConfig.scale.min
          });
        }
        if (networkScale <= graphConfig.scale.max) {
          network.moveTo({
            scale: graphConfig.scale.max
          });
        }
      }
      handleZoom(event, networkScale);
    },
    release: (event) => {
      if (!props.graphEditMode) {
        let targetClassName = event.event.target.className;
        let usingNavigationButtons = targetClassName || event.event.deltaX || event.event.deltaY ? true : false;
        let usingZoomButtons = targetClassName === "vis-button vis-zoomOut" || targetClassName === "vis-button vis-zoomIn";
        if (usingNavigationButtons && !usingZoomButtons) {
          updateConfigOnNavigation(event);
        }
      }
    }
  };

  return (
    <div id="graphVis">
      <Dropdown
        overlay={menu}
        trigger={["contextMenu"]}
        visible={contextMenuVisible}
      >
        <div>
          <Graph
            graph={graphData}
            options={options}
            events={events}
            getNetwork={initNetworkInstance}
          />
        </div>
      </Dropdown>
      <AddEditRelationship
        openRelationshipModal={openRelationshipModal}
        setOpenRelationshipModal={setOpenRelationshipModal}
        isEditing={!newRelationship}
        relationshipInfo={selectedRelationship}
        entityTypes={props.entityTypes}
        updateSavedEntity={props.updateSavedEntity}
        relationshipModalVisible={props.relationshipModalVisible}
        toggleRelationshipModal={props.toggleRelationshipModal}
        canReadEntityModel={props.canReadEntityModel}
        canWriteEntityModel={props.canWriteEntityModel}
        entityMetadata={entityMetadata} //passing in for colors, update when colors are retrieved from backend
      />
    </div>
  );
};

export default GraphVis;
