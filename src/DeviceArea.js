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

const logger = winston_logger.child({ source: 'DeviceArea.js' });

const { Content } = Layout;
const ButtonGroup = Button.Group;
const { Option } = Select;
const { confirm } = Modal;

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
            <Badge status="success" />
            {record._thingId}
          </span>
        ),
      },
      {
        title: "Actions",
        width: 150,
        align: "center",
        render: (text, record) => (
          <span style={{ float: "center" }}>
            <Modal
              title="Deploy trust agent"
              visible={this.state.visible}
              onOk={this.handleOkEdit}
              onCancel={this.handleCancelEdit}
              maskStyle={{ opacity: 0.1 }}
            >
              <Select
                style={{ width: 400 }}
                onChange={this.handleDropdownChange}
              >
                {this.context.trust_agents.map((item) => (
                  <Option key={item._thingId} value={JSON.stringify(item)}>
                    {item._thingId}
                  </Option>
                ))}
              </Select>
              <ReactJson src={this.state.trust_agent} />
            </Modal>
            <ButtonGroup size="small" type="dashed">
              <Tooltip title="Deploy trust agent">
                <Button
                  type="primary"
                  icon="edit"
                  onClick={() => {
                    this.setState({ active_device: record.id });
                    this.showModal();
                  }}
                  ghost
                />
              </Tooltip>
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
                      onCancel: () => {},
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
      visible: false,
      trust_agent: { value: "" },
      active_device: "",
      new_device: require("./resources/cps_device_template.json"),
      edited_device: "",
    };
    //this.editor = React.createRef();
  }

  showModal = () => {
    this.setState({
      visible: true,
    });
  };

  handleDropdownChange = (value) => {
    logger.info("value", value);
    logger.info(this.state.trust_agent);
    this.setState({ trust_agent: JSON.parse(value) });
    logger.info("trust_agent", this.state.trust_agent);
  };

  handleOkEdit = (e) => {
    //logger.info(e);
    //TODO: edit the twin
    let thingId = this.state.active_device;
    let desired_agent = this.state.trust_agent;
    this.deployTrustAgent(thingId, desired_agent._attributes);
    this.setState({
      visible: false,
      active_device: {},
      trust_agent: {},
    });
  };

  handleCancelEdit = (e) => {
    logger.info(e);
    this.setState({
      visible: false,
    });
  };

  handleChange = (value) => {
    this.setState({ new_device: value });
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
                    title: "Create a new device twin in Eclipse Ditto",
                    width: 800,
                    height: 800,
                    content: (
                      <Editor
                        value={this.state.new_device}
                        onChange={this.handleChange}
                      />
                    ),
                    onOk: () => {
                      this.createDeviceTwin(this.state.new_device);
                    },
                    onCancel: () => {},
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
                dataSource={this.context.devices}
                columns={this.columns}
                pagination={{ pageSize: 50 }}
                //scroll={{ y: 500 }}
                //expandRowByClick={true}
                expandedRowRender={(record) => (
                  <ReactJson src={record} enableClipboard={false} />
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
          `Finished deleting the device twin with the result: ${JSON.stringify(result)}`
        )
      );
  };

  deleteAllTwins = async () => {    
    this.context.devices.forEach(device => {
      //logger.info(device.id); 
      this.deleteDeviceTwin(device.id);        
    });    
  };

  deployTrustAgent = async (thingId, desired_agent) => {
    //var test_handle = new DesiredPropertyFeaturesHandle();
    //logger.info(test_handle.constructor.name);

    //var test = Feature.fromObject({ desiredProperties: {} });
    //logger.info(test);
    desired_agent.status = "running";
    logger.info(desired_agent);
    const featuresHandle = this.context.ditto_client.getFeaturesHandle(thingId);
    featuresHandle
      .putDesiredProperties("agent", desired_agent)
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

  updateDeviceTwin = async () => {
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
