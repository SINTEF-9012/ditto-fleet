import React, { Component } from "react";
import {
  Button,
  Layout,
  Col,
  Row,
  Table,
  Tooltip,
  Badge,
  Modal,
  Popconfirm,
} from "antd";
import ReactJson from "react-json-view";
import { GlobalContext } from "./GlobalContext";
import { Thing } from "@eclipse-ditto/ditto-javascript-client-dom";
import { JsonEditor as Editor } from "jsoneditor-react";
import "jsoneditor-react/es/editor.min.css";
import winston_logger from "./logger.js";

const logger = winston_logger.child({ source: "TrustAgentArea.js" });

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
          <span>
            <Badge
              color={
                record._attributes.type === "trust_agent_docker"
                  ? "blue"
                  : "green"
              }
            />
            {record._thingId}
          </span>
        ),
      },
      {
        title: "Actions",
        width: 100,
        align: "center",
        render: (text, record) => (
          <span style={{ float: "center" }}>
            {/* <Modal
              mask={false}
              title="Basic modal"
              visible={this.state.visible}
              onOk={this.handleOk}
              onCancel={this.handleCancel}
            >
              <p>Some contents...</p>
              <p>Some contents...</p>
              <p>Some contents...</p>
            </Modal> */}
            <ButtonGroup size="small" type="dashed">
              <Tooltip title="Deploy on all suitable devices">
              <Popconfirm
                  title={"Deploy on all devices: " + record.id}
                  onConfirm={() => this.assignTrustAgentToAll(record)}
                  okText="Yes"
                  cancelText="No"                >
                  <Button type="primary" icon="deployment-unit" ghost />
                </Popconfirm>                
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
              <Popconfirm
                  title={"Delete trust agent: " + record.id}
                  onConfirm={() => this.deleteTrustAgent(record.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="primary" icon="delete" ghost />
                </Popconfirm>                
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
      new_trust_agent_docker: require("./resources/docker_agent_template.json"),
      new_trust_agent_ssh: require("./resources/ssh_agent_template.json"),
      new_trust_agent_json: "",
    };
    this.editor = React.createRef();
  }

  /** Handles the opening of the modal window by making it visible */
  showModal = () => {
    logger.info("showModal");
    this.setState({
      visible: true,
    });
  };

  /** Handles the OK button of the modal window */
  handleOk = (e) => {
    logger.info(e);
    this.setState({
      visible: false,
    });
  };

  /** Handles the closing of the modal window by making it invisible */
  handleCancel = (e) => {
    logger.info(e);
    this.setState({
      visible: false,
    });
  };

  /** Handles the changes in the JSON editor when creating a new trust agent  */
  handleChange = (value) => {
    this.setState({ new_trust_agent_json: value });
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
                    title: "Create a new trust agent for Docker",
                    width: 800,
                    content: (
                      <Editor
                        value={this.state.new_trust_agent_docker}
                        onChange={this.handleChange}
                      />
                    ),
                    onOk: () => {
                      this.createTrustAgent(this.state.new_trust_agent_docker);
                    },
                    onCancel: () => {
                      //this.setState({ payload: "Hello world!" });
                    },
                  })
                }
              >
                New trust agent for Docker
              </Button>
              <Button
                type="primary"
                style={{ marginTop: 16, marginBottom: 16, marginRight: 16 }}
                onClick={() =>
                  Modal.confirm({
                    title: "Create a new trust agent for SSH",
                    width: 800,
                    content: (
                      <Editor
                        value={this.state.new_trust_agent_ssh}
                        onChange={this.handleChange}
                      />
                    ),
                    onOk: () => {
                      this.createTrustAgent(this.state.new_trust_agent_ssh);
                    },
                    onCancel: () => {
                      //this.setState({ payload: "Hello world!" });
                    },
                  })
                }
              >
                New trust agent for SSH
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

  /** Executes code after all visual React components are loaded */
  componentDidMount() {
    //add something if needed
  }

  /** Creates a new trust agent in Ditto */
  createTrustAgent = async () => {
    //var json = require("./resources/thing_template.json");
    const trust_agent = Thing.fromObject(this.state.new_trust_agent_json);
    logger.debug("NEW TRUST AGENT: " + JSON.stringify(trust_agent));
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

  /** Deletes the selected trust agent from Ditto */
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

  /** Deletes all trust agents from Ditto */
  deleteAllTrustAgents = async () => {
    this.context.trust_agents.forEach((agent) => {
      //logger.info(agent.id);
      this.deleteTrustAgent(agent.id);
    });
  };

  /** Deploys the selected trust agent to all suitable devices */
  assignTrustAgentToAll = async (trustAgent) => {
    //FIXME: what if a device has both docker and ssh?
    //FIXME: there must only one check whether the device is suitable
    this.context.devices.forEach((device) => {
      const featuresHandle = this.context.ditto_client.getFeaturesHandle(
        device.thingId
      );
      // let trust_agent;
      if (trustAgent._attributes.type === "trust_agent_docker") {
        let trust_agent = {
          container_image: trustAgent._attributes.image,
          container_version: trustAgent._attributes.version,
          container_status: "running",
          ta_meta: trustAgent._attributes,
        };
        featuresHandle
          .putDesiredProperty("cyber", "trustAgent", trust_agent)
          .then((result) =>
            logger.info(
              `Finished updating the device twin with result: ${JSON.stringify(
                result
              )}`
            )
          );
      } else if (trustAgent._attributes.type === "trust_agent_ssh") {
        let trust_agent = {
          process_name: "trust-agent.sh",
          process_status: "running",
          ta_meta: trustAgent._attributes,
        };
        featuresHandle
          .putDesiredProperty("cyber", "trustAgent", trust_agent)
          .then((result) =>
            logger.info(
              `Finished updating the device twin with result: ${JSON.stringify(
                result
              )}`
            )
          );
      } else {
        logger.info(device._thingId + " is not suitable for " + trustAgent._thingId)
      }
    });
  };
}
