import React, { Component } from "react";
import {
  Button,
  Layout,
  Col,
  Row,
  Table,
  Tooltip,
  Badge,
  Tag,
  Dropdown,
  Menu,
  Modal,
  Input,
} from "antd";
import ReactJson from "react-json-view";
import axios from "axios";
import { GlobalContext } from "./GlobalContext";

//import { Map, Marker, Overlay } from "pigeon-maps";

const { Content } = Layout;
const { TextArea } = Input;
const ButtonGroup = Button.Group;
const colors = [
  "blue",
  "red",
  "green",
  "blue",
  "red",
  "green",
  "blue",
  "red",
  "green",
];

export class DeviceArea extends Component {
  static contextType = GlobalContext;

  constructor(props) {
    super(props);
    this.columns = [
      {
        title: "Device ID",
        dataIndex: "_thingId",
        width: 100,
        render: (text, record) =>
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
          //),
      },
      /* {
        title: "Tags",
        dataIndex: "tags",
        render: (text, record) =>
          this.context.deviceTags[record.id] &&
          Object.keys({
            ...this.context.deviceTags[record.id],
            ...this.context.deviceProperties[record.id],
          }).map((key, i) => (
            <Tag color={colors[i]}>
              {key}:{" "}
              {
                {
                  ...this.context.deviceTags[record.id],
                  ...this.context.deviceProperties[record.id],
                }[key]
              }
            </Tag>
          )),
        width: 250,
      }, */
      {
        title: "Actions",
        width: 150,
        align: "center",
        render: (text, record) => (
          <span style={{ float: "right" }}>
            <Modal
              mask={false}
              title="Basic Modal"
              visible={this.state.visible}
              onOk={this.handleOk}
              onCancel={this.handleCancel}
            >
              <p>Some contents...</p>
              <p>Some contents...</p>
              <p>Some contents...</p>
            </Modal>
            <ButtonGroup size="small" type="dashed">
              <Tooltip title="Invoke direct method">
                <Button
                  type="primary"
                  icon="api"
                  onClick={
                    () =>
                      Modal.confirm({
                        title: "Invoke direct method on: " + record.id,
                        content: (
                          <TextArea
                            rows={4}
                            defaultValue={this.state.payload}
                            onChange={(e) =>
                              this.setState({ payload: e.target.value })
                            }
                          />
                        ),
                        onOk: () => {
                          this.invokeDirectMethod(record.id, {
                            methodName: "invokeDirectMethod",
                            payload: this.state.payload,
                          });
                        },
                        onCancel: () => {
                          this.setState({ payload: "Hello world!" });
                        },
                      })
                    // this.invokeDirectMethod(record.id, {
                    //   methodName: "invokeDirectMethod",
                    //   payload: "Hello world!",
                    // })
                  }
                  ghost
                />
              </Tooltip>
              <Tooltip title="Send a C2D message">
                <Button
                  type="primary"
                  icon="cloud-download"
                  onClick={() =>
                    Modal.confirm({
                      title: "Send a C2D message to: " + record.id,
                      content: (
                        <TextArea
                          rows={4}
                          defaultValue={this.state.payload}
                          onChange={(e) =>
                            this.setState({ payload: e.target.value })
                          }
                        />
                      ),
                      onOk: () => {
                        this.sendC2DMessage(record.id, {
                          payload: this.state.payload,
                        });
                      },
                      onCancel: () => {
                        this.setState({ payload: "Hello world!" });
                      },
                    })
                  }
                  ghost
                />
              </Tooltip>
              <Tooltip title="Emulate device failure">
                <Button
                  type="primary"
                  icon="bug"
                  onClick={() =>
                    this.tagDevice(record.id, { status: "failed" })
                  }
                  ghost
                />
              </Tooltip>
              <Tooltip title="Fix device">
                <Button
                  type="primary"
                  icon="tool"
                  onClick={() =>
                    this.tagDevice(record.id, { status: "running" })
                  }
                  ghost
                />
              </Tooltip>

              <Dropdown
                overlay={
                  <Menu>
                    <Menu.Item key="0">
                      <Button
                        type="link"
                        onClick={() =>
                          this.tagDevice(record.id, {
                            environment: "production",
                          })
                        }
                      >
                        Production
                      </Button>
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item key="1">
                      <Button
                        type="link"
                        onClick={() =>
                          this.tagDevice(record.id, { environment: "preview" })
                        }
                      >
                        Preview
                      </Button>
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item key="3">
                      <Button
                        type="link"
                        onClick={() =>
                          this.tagDevice(record.id, { environment: "testing" })
                        }
                      >
                        Testing
                      </Button>
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item key="4">
                      <Button
                        type="link"
                        onClick={() =>
                          this.tagDevice(record.id, {
                            environment: "safe-mode",
                          })
                        }
                      >
                        Safe mode
                      </Button>
                    </Menu.Item>
                  </Menu>
                }
              >
                <Tooltip title="Put device into ...">
                  <Button
                    //type={
                    //  this.context.deviceTags[record.id] &&
                    //  this.context.deviceTags[record.id].status === "failed"
                    //    ? "danger"
                    //    : "primary"
                    //}
                    icon="tag"
                    ghost
                  />
                </Tooltip>
              </Dropdown>

              <Dropdown
                overlay={
                  <Menu>
                    <Menu.Item key="0">
                      <Button
                        type="link"
                        onClick={() =>
                          this.tagDevices(record.id, {
                            environment: "production",
                          })
                        }
                      >
                        Production
                      </Button>
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item key="1">
                      <Button
                        type="link"
                        onClick={() =>
                          this.tagDevices(record.id, { environment: "preview" })
                        }
                      >
                        Preview
                      </Button>
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item key="3">
                      <Button
                        type="link"
                        onClick={() =>
                          this.tagDevices(record.id, { environment: "testing" })
                        }
                      >
                        Testing
                      </Button>
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item key="4">
                      <Button
                        type="link"
                        onClick={() =>
                          this.tagDevices(record.id, {
                            environment: "safe-mode",
                          })
                        }
                      >
                        Safe mode
                      </Button>
                    </Menu.Item>
                  </Menu>
                }
              >
                <Tooltip title="Put all affected devices into ...">
                  <Button
                    //type={
                    //  this.context.deviceTags[record.id] &&
                    //  this.context.deviceTags[record.id].status === "failed"
                    //    ? "danger"
                    //    : "primary"
                    //}
                    icon="tags"
                    ghost
                  />
                </Tooltip>
              </Dropdown>

              {/* <Tooltip title="Copy"><Button type="primary" icon="copy" ghost /></Tooltip>
              <Tooltip title="Save"><Button type="primary" icon="save" onClick={()=>{this.saveDeployment()}} ghost /></Tooltip>
              <Tooltip title="Delete"><Popconfirm title="Sure to delete?" onConfirm={() => this.deleteDeployment(record.id)}><Button type="primary" icon="delete" ghost /></Popconfirm></Tooltip> */}
              {/* <Tooltip title="Push variant"><Button type="primary" icon="rocket" onClick={()=>{this.pushVariant()}} ghost /></Tooltip> */}
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
    };
    this.editor = React.createRef();
  }

  showModal = () => {
    console.log("showModal");
    this.setState({
      visible: true,
    });
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
          <Row>
            <Col span={24}>
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
            {/* <Col
              span={12}
              style={{ backgroundColor: "lightblue", height: "500px" }}
            >
              <Map
                defaultCenter={[59.913, 10.752]}
                defaultZoom={10}
                width={1000}
                height={600}
              >
                {this.context.devices
                  .filter((item) => {
                    return "properties.lat" in item.properties;
                  })
                  .map(({ id, properties }) => (
                    <Marker
                      anchor={[
                        parseFloat(properties["properties.lat"]),
                        parseFloat(properties["properties.lon"]),
                      ]}
                      payload={2}
                    />
                  ))}
              </Map>
            </Col> */}
          </Row>          
        </Content>
      </Layout>
    );
  }

  componentDidMount() {
    //add if needed
  }

  /**
   * Invoke a direct method on a device (synchronous)
   */
  invokeDirectMethod = async (device, payload) => {
    // TODO:
    //await axios.put("api/device/" + device, tags);
    console.log("Direct method invoked on: " + device, payload);
    await axios.put("api/device/" + device + "/invoke", payload);
  };

  /**
   * Send a message to a device from the cloud (asynchronous)
   */
  sendC2DMessage = async (device, payload) => {
    // TODO:
    //await axios.put("api/device/" + device, tags);
    console.log("C2D message sent to: " + device, payload);
    await axios.put("api/device/" + device + "/c2d", payload);
  };

  /**
   * Tag selected device (e.g. to put it into a safe mode)
   */
  tagDevice = async (device, tags) => {
    await axios.put("api/device/" + device, tags);
  };

  /**
   * Tag all devices affected by a deployment (e.g. to put it into a safe mode)
   */
  tagDevices = async (device, tags) => {
    let faultyDeployments = this.context.activeDeployments[device];
    console.log("deployments" + JSON.stringify(faultyDeployments));
    faultyDeployments.forEach((deployment) => {
      let faultyDevices = this.context.appliedDevices[deployment];
      console.log(this.context.appliedDevices[deployment]);
      faultyDevices.forEach((fDevice) => {
        console.log(fDevice.deviceId);
        this.tagDevice(fDevice.deviceId, tags);
      });
    });
  };
}
