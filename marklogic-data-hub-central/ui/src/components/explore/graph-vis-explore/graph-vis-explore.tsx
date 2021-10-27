import React, {useState, useEffect} from "react";
import Graph from "react-graph-vis";
import "./graph-vis-explore.scss";
import graphConfig from "../../../config/graph-vis.config";
import {Dropdown, Menu} from "antd";
import * as _ from "lodash";

type Props = {
  entityTypes: any;
  splitPaneResized: any;
  setSplitPaneResized: any;
};

let entityMetadata = {};
// TODO temp hardcoded node data, remove when retrieved from db
// entityMetadata = graphConfig.sampleMetadata;

const GraphVisExplore: React.FC<Props> = (props) => {

  const [graphData, setGraphData] = useState({nodes: [], edges: []});
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [clickedNode, setClickedNode] = useState(undefined);
  const [hasStabilized, setHasStabilized] = useState(false);

  // Get network instance on init
  const [network, setNetwork] = useState<any>(null);
  const initNetworkInstance = (networkInstance) => {
    setNetwork(networkInstance);
  };
  const [networkHeight, setNetworkHeight] = useState(graphConfig.defaultOptions.height);
  const vis = require("vis-network/standalone/umd/vis-network"); //eslint-disable-line @typescript-eslint/no-unused-vars

  // Load coords *once* on init


  useEffect(() => {
    if (props.splitPaneResized) {
      setGraphData({
        nodes: getNodes(),
        edges: getEdges()
      });
      props.setSplitPaneResized(false);
    }
  }, [props.splitPaneResized]);

  const getNodes = () => {
    let nodes;
    //handle logic for generating nodes here
    return nodes;
  };

  const getEdges = () => {
    let edges: any = [];
    //handle logic for generating edges here
    return edges;
  };

  const options = {
    ...graphConfig.defaultOptions,
    height: networkHeight,
    layout: {
      //hierarchical: true
      //randomSeed: "0.7696:1625099255200",
    },
    physics: {
      //enabled: physicsEnabled,
      barnesHut: {
        springLength: 160,
        springConstant: 1,
        avoidOverlap: 1
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
      enabled: false
    },
  };

  const menuClick = async (event) => {
    setContextMenuVisible(false);
    if (event.key === "1") {
      if (network) {
        //add logic for menu selection here
      }
    }
  };

  const menu = () => {
    return (
      <Menu id="contextMenu" onClick={menuClick}>
        { clickedNode &&
      <Menu.Item key="1">
        Dummy option(Should be updated in future sprints)
      </Menu.Item> }
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
    //Zoom logic goes here
  }, 400);

  const events = {
    select: (event) => {
      // console.info("SELECT", event);
    },
    click: (event) => {
      //if click is on an edge
      if (event.edges.length > 0 && event.nodes.length < 1) {
        let connectedNodes = network.getConnectedNodes(event.edges[0]);
        //Add node click actions here
      }
      if (clickedNode) {
        setClickedNode(undefined);
      }
    },

    dragStart: (event) => {

    },
    dragEnd: async (event) => {
      let {nodes} = event;
      if (nodes.length > 0) {
        let positions = network.getPositions([nodes[0]])[nodes[0]];
        if (positions && positions.x && positions.y) {

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
      event.event.target.style.cursor = "pointer";
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
        if (positions && Object.keys(positions).length) {
        //   saveUnsavedCoords();
        //   setHasStabilized(true);
        //   if (physicsEnabled) {
        //     setPhysicsEnabled(false);
        //     return false;
        //   }
        }
        // if (modelingOptions.selectedEntity && selectedEntityExists()) {
        //   try { // Visjs might not have new entity yet, catch error
        //     network.selectNodes([modelingOptions.selectedEntity]);
        //   } catch (err) {
        //     console.error(err);
        //   }
        // }
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
      //Zoom scale logic goes here
      handleZoom(event, networkScale);
    },
    release: (event) => {
      //Add graph span logic here
    //   if (!props.graphEditMode) {
    //     let targetClassName = event.event.target.className;
    //     let usingNavigationButtons = targetClassName || event.event.deltaX || event.event.deltaY ? true : false;
    //     let usingZoomButtons = targetClassName === "vis-button vis-zoomOut" || targetClassName === "vis-button vis-zoomIn";
    //     if (usingNavigationButtons && !usingZoomButtons) {
    //       updateConfigOnNavigation(event);
    //     }
    //   }
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
    </div>
  );
};

export default GraphVisExplore;
