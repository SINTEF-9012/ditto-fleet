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
              onOk={this.handleOk}
              onCancel={this.handleCancel}
            >
              <Select
                //defaultValue="lucy"
                labelInValue
                style={{ width: 400 }}
                onChange={this.handleDropdownChange}
              >
                {this.context.trust_agents.map((item) => (
                  <Option
                    //title={item._thingId}
                    key={item._thingId}
                    //id={item._thingId}
                    value={JSON.stringify(item)}
                  >
                    {item._thingId}
                  </Option>
                ))}
              </Select>
              <ReactJson src={JSON.parse(this.state.trust_agent)} />
            </Modal>
            <ButtonGroup size="small" type="dashed">
              <Tooltip title="Deploy trust agent">
                <Button
                  type="primary"
                  icon="edit"
                  onClick={
                    () => {
                      this.showModal();
                    }                  }
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
                        this.deleteDevice(record.id);
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
      trust_agent: "{}",
      new_device_json: require("./resources/device_template.json"),
      edited_device: "",
    };
    this.editor = React.createRef();
  }

  showModal = () => {
    this.setState({
      visible: true,
    });
  };

  showConfirm = (thingId) => {
    confirm({
      title: "Do you want to delete: " + thingId,
      content:
        "When clicked the OK button, this dialog will be closed after 1 second",
      onOk() {
        this.deleteDevice(thingId);
      },
      onCancel() {},
    });
  };

  handleDropdownChange = (value) => {
    //console.log(JSON.stringify(value));
    //console.log(value.label);
    this.setState({ trust_agent: value.key });
    console.log(this.state.trust_agent);
  };

  handleOk = (e) => {
    console.log(e);
    this.setState({
      visible: false,
    });
  };

  handleCancel = (e) => {
    console.log(e);
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
                    title: "Create a new device in Eclipse Ditto",
                    width: 800,
                    height: 800,
                    content: (
                      <Editor
                        value={this.state.new_device_json}
                        onChange={this.handleChange}
                      />
                    ),
                    onOk: () => {
                      this.createDevice(this.state.new_device_json);
                    },
                    onCancel: () => {
                      this.setState({ payload: "Hello world!" });
                    },
                  })
                }
              >
                Register new device
              </Button>
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

  createDevice = async () => {
    console.log(this.state.new_device_json);
    var device = Thing.fromObject(this.state.new_device_json);
    console.log(device);
    const thingsHandle = this.context.ditto_client.getThingsHandle();
    thingsHandle
      .putThing(device)
      .then((result) =>
        console.log(
          `Finished putting the new device with result: ${JSON.stringify(
            result
          )}`
        )
      );
  };

  deleteDevice = async (thingId) => {
    const thingsHandle = this.context.ditto_client.getThingsHandle();
    thingsHandle
      .deleteThing(thingId)
      .then((result) =>
        console.log(
          `Finished deleting the device with result: ${JSON.stringify(result)}`
        )
      );
  };

  deployTrustAgent = async (thingId, trust_agent) => {
    //var test_handle = new DesiredPropertyFeaturesHandle();
    //console.info(test_handle.constructor.name);
    var test = Feature.fromObject({ desiredProperties: {} });
    console.info(test);
    const featuresHandle = this.context.ditto_client.getFeaturesHandle(thingId);
    console.info(featuresHandle.constructor.name);
    //featuresHandle.putProperties("trustAgent", {
    //  version: "hi there!",
    //  status: "oh no",
    //});

    // TODO: send an MQTT message to an adapter
    console.info("Sending a MQTT message to deploy a trust agent");
  };

  updateDeviceTwin = async () => {
    console.log(this.state.edited_device.features);
    var features = Features.fromObject(this.state.edited_device._features);
    console.log("DEVICE FEATURES: ", features);
    console.log("DEVICE ID: ", this.state.edited_device._thingId);
    const featuresHandle = this.context.ditto_client.getFeaturesHandle(
      this.state.edited_device._thingId
    );
    featuresHandle
      .putFeatures(features)
      .then((result) =>
        console.log(
          `Finished updating the device with result: ${JSON.stringify(result)}`
        )
      );
  };   
}
