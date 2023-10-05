import React, { Component } from "react";
import { Button, Layout, Col, Row, Table, Tooltip, Badge, Modal, Popconfirm } from "antd";
import ReactJson from "react-json-view";
import { GlobalContext } from "./GlobalContext";
import { Thing } from "@eclipse-ditto/ditto-javascript-client-dom";
import { JsonEditor as Editor } from "jsoneditor-react";
import "jsoneditor-react/es/editor.min.css";
import winston_logger from "./logger.js";

const logger = winston_logger.child({ source: 'TrustAgentArea.js' });

//import { Map, Marker, Overlay } from "pigeon-maps";
const { Content } = Layout;
const ButtonGroup = Button.Group;

export class TrustAgentArea extends Component {
  static contextType = GlobalContext;

  constructor(props) {
    super(props);
    this.columns = [
      {
        title: "Trust Agent ID",
        dataIndex: "_thingId",
        align: "left",
        render: (text, record) => (
          //this.context.deviceTags[record.id].status === "failed" ? (
          //  <span>
          //    <Badge status="error" />
          //    {record.id}
          //  </span>
          //) : (
          <span>
            <Badge status="success" />
            {record._thingId}
          </span>
        ),
        //),
      },
      {
        title: "Actions",
        width: 100,
        align: "center",
        render: (text, record) => (
          <span style={{ float: "center" }}>
            <Modal
              mask={false}
              title="Basic modal"
              visible={this.state.visible}
              onOk={this.handleOk}
              onCancel={this.handleCancel}
            >
              <p>Some contents...</p>
              <p>Some contents...</p>
              <p>Some contents...</p>
            </Modal>
            <ButtonGroup size="small" type="dashed">
              <Tooltip title="Deploy on all suitable devices">
                <Button
                  type="primary"
                  icon="deployment-unit"
                  onClick={() => this.deployTrustAgentToAll(record.id)}
                  ghost
                />
              </Tooltip>
              {/* <Tooltip title="Deploy on selected devices">
                <Button
                  type="primary"
                  icon="deployment-unit"
                  onClick={() => this.deployTrustAgentToSelected(record.id, record.id)}
                  ghost
                />
              </Tooltip> */}
              <Tooltip title="Delete trust agent">
                <Button
                  type="primary"
                  icon="delete"
                  onClick={() => this.deleteTrustAgent(record.id)}
                  ghost
                />
              </Tooltip>
            </ButtonGroup>
          </span>
        ),
      },
    ];
    this.nestedColumns = [
      {
        title: "Active deployments",
        dataIndex: "id",
        render: (text, record) => (
          <Button
            type="link"
            icon="deployment-unit"
            onClick={() => this.context.handleTabChange("3")}
          >
            {record}
          </Button>
        ),
      },
    ];
    this.state = {
      //add if needed
      visible: false,
      payload: "Hello world!",
      new_trust_agent_json: require("./resources/cps_agent_template.json"),
    };
    this.editor = React.createRef();
  }

  showModal = () => {
    logger.info("showModal");
    this.setState({
      visible: true,
    });
  };

  handleOk = (e) => {
    logger.info(e);
    this.setState({
      visible: false,
    });
  };

  handleCancel = (e) => {
    logger.info(e);
    this.setState({
      visible: false,
    });
  };

  render() {
    return (
      <Layout>
        <Content>
          <Row type="flex" justify="end">
            <Col>
              <Button
                type="primary"
                style={{ marginTop: 16, marginBottom: 16, marginRight: 16 }}
                onClick={() =>
                  Modal.confirm({
                    title: "Create a new trust agent",
                    width: 800,
                    content: (
                      <Editor
                        value={this.state.new_trust_agent_json}
                        onChange={this.handleChange}
                      />
                    ),
                    onOk: () => {
                      this.createTrustAgent(this.state.new_trust_agent_json);
                    },
                    onCancel: () => {
                      //this.setState({ payload: "Hello world!" });
                    },
                  })
                }
              >
                New trust agent
              </Button>
              <Popconfirm
                title="Delete all trust agents?"
                onConfirm={this.deleteAllTrustAgents}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="danger"
                  style={{ marginTop: 16, marginBottom: 16, marginRight: 16 }}
                >
                  Delete all
                </Button>
              </Popconfirm>
            </Col>
          </Row>
          <Row>
            <Col>
              <Table
                //bordered
                rowKey={(record) => record.id}
                size="small"
                dataSource={this.context.trust_agents}
                columns={this.columns}
                pagination={{ pageSize: 50 }}
                //scroll={{ y: 500 }}
                //expandRowByClick={true}
                expandedRowRender={(record) => (
                  <span>
                    <ReactJson src={record} enableClipboard={false} />
                    {/* <Table
                      columns={this.nestedColumns}
                      dataSource={
                        this.context.activeDeployments[record.id]
                          ? Object.values(
                              this.context.activeDeployments[record.id]
                            )
                          : []
                      }
                      pagination={false}
                    /> */}
                  </span>
                )}
              />
            </Col>            
          </Row>
        </Content>
      </Layout>
    );
  }

  componentDidMount() {
    //add something if needed
  }

  handleChange = (value) => {
    this.setState({ new_trust_agent_json: value });
  };

  createTrustAgent = async () => {
    //var json = require("./resources/thing_template.json");
    const trust_agent = Thing.fromObject(this.state.new_trust_agent_json);
    logger.info(trust_agent);
    const thingsHandle = this.context.ditto_client.getThingsHandle();
    thingsHandle
      .putThing(trust_agent)
      .then((result) =>
      logger.info(
          `Finished putting the new trust agent with result: ${JSON.stringify(
            result
          )}`
        )
      );
  };

  deleteTrustAgent = async (trustAgentId) => {
    const thingsHandle = this.context.ditto_client.getThingsHandle();
    thingsHandle
      .deleteThing(trustAgentId)
      .then((result) =>
      logger.info(
          `Finished deleting the trust agent with result: ${JSON.stringify(
            result
          )}`
        )
      );
  };

  deleteAllTrustAgents = async () => {    
    this.context.trust_agents.forEach(agent => {
      //logger.info(agent.id); 
      this.deleteTrustAgent(agent.id);        
    });    
  }

  deployTrustAgentToAll = async (trustAgentId) => {
    //TODO: basic logic to check for suitable devicves in the fleet, and then modify desired propoerties one by one
    //const thingsHandle = this.context.ditto_client.getThingsHandle();
    //thingsHandle
    //  .deleteThing(trustAgentId)
    //  .then((result) =>
    //    console.log(
    //      `Finished deleting the trust agent with result: ${JSON.stringify(
    //        result
    //      )}`
    //    )
    //  );
  };

  deployTrustAgentToSelected = async (trustAgentId, deviceId) => {
    //TODO: modify desired properties of that device. Maybe check if it is suitable in the first place.    
  };

  checkSuitability(trustAgent, devices) {
    //TODO: check if main attributes of the trust agent are satisfied by all available devices. 
  }
}
