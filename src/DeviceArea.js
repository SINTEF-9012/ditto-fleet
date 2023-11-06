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
  Select,
  Popconfirm,
  Switch,
} from "antd";
import ReactJson from "react-json-view";
import { GlobalContext } from "./GlobalContext";
import {
  Feature,
  Thing,
  Features,
} from "@eclipse-ditto/ditto-javascript-client-dom";
import { JsonEditor as Editor } from "jsoneditor-react";
import "jsoneditor-react/es/editor.min.css";
import winston_logger from "./logger.js";

const logger = winston_logger.child({ source: "DeviceArea.js" });

const { Content } = Layout;
const ButtonGroup = Button.Group;
const { Option } = Select;
//const { confirm } = Modal;

export class DeviceArea extends Component {
  static contextType = GlobalContext;

  constructor(props) {
    super(props);
    this.columns = [
      {
        title: "Device ID",
        dataIndex: "_thingId",
        align: "left",
        //width: 100,
        render: (text, record) => (
          //this.context.deviceTags[record.id].status === "failed" ? (
          //  <span>
          //    <Badge status="error" />
          //    {record.id}
          //  </span>
          //) : (
          <span>
            <Badge status={record._attributes.type === "physical_device" ? "processing" : "default"} />
            {record._thingId}
          </span>
        ),
      },
      {
        title: "Actions",
        width: 150,
        align: "right",
        render: (text, record) => (
          <span style={{ float: "center" }}>
            <ButtonGroup size="small" type="dashed">
              <Tooltip title="Deploy a trust agent">
                <Button
                  type="primary"
                  icon="safety-certificate"
                  onClick={() =>
                    Modal.confirm({
                      title: "Deploy a trust agent",
                      //width: 600,
                      //height: 300,
                      content: (
                        <Select
                          style={{ width: "100%" }}
                          align="middle"
                          onSelect={(value, event) =>
                            this.handleDropdownChange(value, event)
                          }
                        >
                          {this.context.trust_agents.map((item) => (
                            <Option
                              key={item._thingId}
                              value={JSON.stringify(item)}
                            >
                              {item._thingId}
                            </Option>
                          ))}
                        </Select>
                      ),
                      onOk: () => {
                        this.deployTrustAgent(
                          this.state.active_device._thingId,
                          this.state.trust_agent
                        );
                      },
                      onCancel: () => {
                        this.handleCancelEdit();
                      },
                    })
                  }
                  ghost
                />
              </Tooltip>
              {/* <Tooltip title="Edit digital twin">
                <Button
                  type="primary"
                  icon="edit"
                  onClick={() =>
                    Modal.confirm({
                      title: "Edit device twin",
                      width: 800,
                      height: 600,
                      content: (
                        <Editor
                          value={this.state.active_device}
                          onChange={this.handleExistingTwinChange}
                        />
                      ),
                      onOk: () => {
                        //TODO: update the digital twin
                        //this.deployTrustAgent(
                        //  this.state.active_device,
                        //  this.state.trust_agent
                        //);
                      },
                      onCancel: () => {
                        this.handleCancelEdit();
                      },
                    })
                  }
                  ghost
                />
              </Tooltip> */}
              <Tooltip title="Delete device twin">
                <Button
                  type="primary"
                  icon="delete"
                  onClick={() =>
                    Modal.confirm({
                      title: "Delete device twin: " + record.id,
                      width: 800,
                      onOk: () => {
                        this.deleteDeviceTwin(record.id);
                      },
                      onCancel: () => {
                        this.handleCancelEdit();
                      },
                    })
                  }
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
      trust_agent: { value: "" },
      active_device: "",
      new_device: require("./resources/cps_device_template.json"),
      edited_device: "",
      simulation: true,
    };
  }

  /* showModal = (thingId) => {
    Modal.confirm({
      title: "Deploy a trust agent",
      //width: 600,
      //height: 300,
      content: (
        <div>
          <Select style={{ width: 310 }} onSelect={this.handleDropdownChange}>
            {this.context.trust_agents.map((item) => (
              <Option key={item._thingId} value={JSON.stringify(item)}>
                {item._thingId}
              </Option>
            ))}
          </Select>
        </div>
      ),
      onOk: () => {
        this.createDeviceTwin(this.state.new_device);
      },
      onCancel: () => {},
    });
  }; */

  handleDropdownChange = (value, event) => {
    logger.info("value: " + value);
    logger.info("Current trust_agent " + this.state.trust_agent);
    this.setState({ trust_agent: JSON.parse(value) });
    logger.info("Current trust_agent: " + this.state.trust_agent);
  };

  handleOkEdit = (e) => {
    //logger.info(e);
    //TODO: edit the whole twin, not just the trust agent
    let thingId = this.state.active_device._thingId;
    let desired_agent = this.state.trust_agent;
    this.deployTrustAgent(thingId, desired_agent._attributes);
    this.setState({
      active_device: {},
      trust_agent: {},
    });
  };

  handleCancelEdit = (e) => {
    logger.info(e);
  };

  handleNewTwinChange = (value) => {
    this.setState({ new_device: value });
  };

  handleExistingTwinChange = (value) => {
    this.setState({ new_device: value });
  };

  handleSimulationSwitchChange = (value) => {
    logger.info(value)
    this.setState({ simulation: value });
  };

  render() {
    return (
      <Layout>
        <Content>
          <Row>
            <Col flex="auto" justify="end" align="right">
              <Switch
                checkedChildren="Sim"
                unCheckedChildren="Phy"
                defaultChecked
                style={{
                  marginTop: 16,
                  marginBottom: 16,
                  marginLeft: 24,
                  float: "left",
                }}
                onChange={this.handleSimulationSwitchChange}
              />
              <Button
                type="primary"
                style={{ marginTop: 16, marginBottom: 16, marginRight: 16 }}
                onClick={() =>
                  Modal.confirm({
                    title: "Create a new device twin",
                    width: 800,
                    height: 800,
                    content: (
                      <Editor
                        value={this.state.new_device}
                        onChange={this.handleNewTwinChange}
                      />
                    ),
                    onOk: () => {
                      this.createDeviceTwin(this.state.new_device);
                    },
                    onCancel: () => {
                      this.handleCancelEdit();
                    },
                  })
                }
              >
                New device twin
              </Button>
              <Popconfirm
                title="Delete all device twins?"
                onConfirm={this.deleteAllTwins}
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
                dataSource={
                  this.state.simulation
                    ? this.context.devices
                    : this.context.physical_devices
                }
                columns={this.columns}
                pagination={{ pageSize: 50 }}
                onRow={(record) => {
                  return {
                    onClick: (event) => {
                      this.setState({ active_device: record });
                    }, // click row
                  };
                }}
                //scroll={{ y: 500 }}
                //expandRowByClick={true}
                expandedRowRender={(record) => (
                  <ReactJson
                    src={record}
                    enableClipboard={false}
                    collapsed="1"
                  />
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

  createDeviceTwin = async () => {
    logger.info(this.state.new_device);
    var device = Thing.fromObject(this.state.new_device);
    logger.info(device);
    const thingsHandle = this.context.ditto_client.getThingsHandle();
    thingsHandle
      .putThing(device)
      .then((result) =>
        logger.info(
          `Finished putting the new device twin with the result: ${JSON.stringify(
            result
          )}`
        )
      );
  };

  deleteDeviceTwin = async (thingId) => {
    const thingsHandle = this.context.ditto_client.getThingsHandle();
    thingsHandle
      .deleteThing(thingId)
      .then((result) =>
        logger.info(
          `Finished deleting the device twin with the result: ${JSON.stringify(
            result
          )}`
        )
      );
  };

  deleteAllTwins = async () => {
    this.context.devices.forEach((device) => {
      //logger.info(device.id);
      this.deleteDeviceTwin(device.id);
    });
  };

  //FIXME: this function is redundant
  deployTrustAgent_old = async (thingId, desired_agent) => {
    //FIXME: this overwrites all of desired properties under same feature! Solution: read the desired properties first, append some new value and put them back.
    //FIXME: do not include features in desired trust agents, only attributes!
    desired_agent.status = "running";
    logger.info("Desired agent", desired_agent);
    const featuresHandle = this.context.ditto_client.getFeaturesHandle(thingId);
    featuresHandle
      .putDesiredProperties("cyber", { trustAgent: desired_agent })
      .then((result) =>
        logger.info(
          `Finished updating the device twin with result: ${JSON.stringify(
            result
          )}`
        )
      );
    //var desired_agent =
    //featuresHandle.putProperties("agent", {
    //  version: "hi there!",
    //  status: "oh no",
    //});

    // TODO: send an MQTT message to an adapter
    logger.info("Sending a MQTT message to deploy a trust agent");
  };

  deployTrustAgent = async (thingId, desired_agent) => {
    //TODO: how to pass the meta information about the trust agent?
    //desired_agent.status = "running";
    logger.debug("Desired agent: " + desired_agent);
    const featuresHandle = this.context.ditto_client.getFeaturesHandle(thingId);
    let trust_agent;
    if (desired_agent._attributes.type === "trust_agent_docker") {
      trust_agent = {
        //name: desired_agent._thingId,
        container_image: desired_agent._attributes.image,
        container_version: desired_agent._attributes.version,
        container_status: "running",
        ta_meta: desired_agent._attributes,
        //  ? desired_agent._attributes.version
        //  : "unknown",
      };
    } else if (desired_agent._attributes.type === "trust_agent_ssh") {
      trust_agent = {
        //name: desired_agent._thingId,
        process_name: "trust-agent.sh",
        //container_version: desired_agent._attributes.version,
        process_status: "running",
        ta_meta: desired_agent._attributes,
        //  ? desired_agent._attributes.version
        //  : "unknown",
      };
    }
    featuresHandle
      .putDesiredProperty("cyber", "trustAgent", trust_agent)
      .then((result) =>
        logger.info(
          `Finished updating the device twin with result: ${JSON.stringify(
            result
          )}`
        )
      );
  };

  updateDeviceTwin = async () => {
    //TODO: sort out how it is different from deployTrustAgent()
    logger.info(this.state.edited_device.features);
    var features = Features.fromObject(this.state.edited_device._features);
    logger.info("DEVICE FEATURES: ", features);
    logger.info("DEVICE ID: ", this.state.edited_device._thingId);
    const featuresHandle = this.context.ditto_client.getFeaturesHandle(
      this.state.edited_device._thingId
    );
    featuresHandle
      .putFeatures(features)
      .then((result) =>
        logger.info(
          `Finished updating the device with result: ${JSON.stringify(result)}`
        )
      );
  };
}
