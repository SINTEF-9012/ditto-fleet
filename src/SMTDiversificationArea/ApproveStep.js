import React, { Component } from "react";
import ReactJson from "react-json-view";
import { Col, Row, Typography, Spin } from "antd";
import { DiversificationContext } from "./DiversificationContext";
import { Graph } from "react-d3-graph";

const { Title } = Typography;

// the graph configuration, you only need to pass down properties
// that you want to override, otherwise default ones will be used
const myConfig = {
  nodeHighlightBehavior: true,
  staticGraph: true,
  //panAndZoom: false,
  maxZoom: 1,
  minZoom: 1,
  height: 1000,
  width: "100%",
  node: {
    color: "lightblue",
    size: 120,
    highlightStrokeColor: "blue",
  },
  link: {
    highlightColor: "lightblue",
  },
};

export class ApproveStep extends Component {
  static contextType = DiversificationContext;

  constructor(props) {
    super(props);
    this.state = {
      nodes: [],
      links: [],
    };
  }  

  render() {
    return (
      <DiversificationContext.Consumer>
        {({ z3_solution }) => (
          <Row>
            <Col span={12}>
              <Title level={4}>Approve the solution for deployment</Title>
              <Spin tip="Loading..." spinning={z3_solution === ""}>
                {/*<TextArea rows={20} value={z3_solution} />*/}
                <ReactJson
                  src={z3_solution}
                  enableClipboard={false}
                  collapsed={2}
                  theme="apathy:inverted"
                />
              </Spin>
            </Col>
            {/* @Hui do we need some visual representation for the assignment? Or maybe even an editor? E.g. we can finalise the assignment by some final fine tuning */}
            <Col span={12}>
            <Title level={4}>Assignment visualisation (EXPERIMENTAL!)</Title>
              <Graph
                id="graph-id" // id is mandatory, if no id is defined rd3g will throw an error
                data={this.context.graph_data}
                config={myConfig}                
                /* onClickNode={onClickNode}
                  onDoubleClickNode={onDoubleClickNode}
                  onRightClickNode={onRightClickNode}
                  onClickGraph={onClickGraph}
                  onClickLink={onClickLink}
                  onRightClickLink={onRightClickLink}
                  onMouseOverNode={onMouseOverNode}
                  onMouseOutNode={onMouseOutNode}
                  onMouseOverLink={onMouseOverLink}
                  onMouseOutLink={onMouseOutLink}
                  onNodePositionChange={onNodePositionChange} */
              />
            </Col>
          </Row>
        )}
      </DiversificationContext.Consumer>
    );
  }

  componentDidMount() {
    //TODO:
    
  }
}
