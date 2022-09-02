import React, { Component } from "react";
import { Button, Layout, Col, Row, Table, Tooltip, Badge, Modal } from "antd";
import ReactJson from "react-json-view";
import { GlobalContext } from "./GlobalContext";
import { Feature, Thing, Features } from "@eclipse-ditto/ditto-javascript-client-dom";
import { JsonEditor as Editor } from "jsoneditor-react";
import "jsoneditor-react/es/editor.min.css";

//import { Map, Marker, Overlay } from "pigeon-maps";
const { Content } = Layout;
const ButtonGroup = Button.Group;

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
          <span style={{ float: "center" }}>
            <ButtonGroup size="small" type="dashed">
            <Tooltip title="Edit device twin">
                <Button
                  type="primary"
                  icon="edit"
                  onClick={ () =>                    
                    Modal.confirm({
                      title: "Edit device twin: " + record.id,
                      width: 800,
                      height: 800,
                      content: (
                        <Editor
                          value={record}
                          onChange={this.handleEdit}
                        />
                      ),
                      onOk: () => {
                        this.updateDeviceTwin(this.state.edited_device);
                      },
                      onCancel: () => {
                        //this.setState({ payload: "Hello world!" });
                      },
                    })
                  }
                  ghost
                />
              </Tooltip>
              {/* <Tooltip title="Deploy trust agent">
                <Button
                  type="primary"
                  icon="cloud-download"
                  onClick={ () =>
                    Modal.confirm({
                      title: "Deploy a trust agent on: " + record.id,
                      width: 800,
                      height: 800,
                      content: (
                        <Editor
                          value={this.state.new_device_json}
                          onChange={this.handleChange}
                        />
                      ),
                      onOk: () => {
                        this.startTrustAgent(record.id);
                      },
                      onCancel: () => {
                        //this.setState({ payload: "Hello world!" });
                      },
                    })
                  }
                  ghost
                />
              </Tooltip>
              <Tooltip title="Start trust agent">
                <Button
                  type="primary"
                  icon="play-circle"
                  onClick={ () =>
                    Modal.confirm({
                      title: "Start a trust agent on: " + record.id,
                      width: 800,
                      height: 800,
                      content: (
                        <Editor
                          value={this.state.new_device_json}
                          onChange={this.handleChange}
                        />
                      ),
                      onOk: () => {
                        this.startTrustAgent(record.id);
                      },
                      onCancel: () => {
                        //this.setState({ payload: "Hello world!" });
                      },
                    })
                  }
                  ghost
                />
              </Tooltip>
              <Tooltip title="Stop trust agent">
                <Button
                  type="primary"
                  icon="pause-circle"
                  onClick={() =>
                    Modal.confirm({
                      title: "Stop the trust agent on: " + record.id,
                      onOk: () => {
                        this.stopTrustAgent(record.id);
                      },
                      onCancel: () => {
                        //this.setState({ payload: "Hello world!" });
                      },
                    })
                  }
                  ghost
                />
              </Tooltip>
              <Tooltip title="Roll back trust agent">
                <Button
                  type="primary"
                  icon="cloud-upload"
                  onClick={() =>
                    Modal.confirm({
                      title: "Undeploy the trust agent from: " + record.id,
                      onOk: () => {
                        this.rollbackTrustAgent(record.id);
                      },
                      onCancel: () => {
                        //this.setState({ payload: "Hello world!" });
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
                  onClick={() => this.deleteDevice(record.id)}
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
      new_device_json: require("./resources/device_template.json"),
      edited_device: {}
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
    //add something if needed
  }

  handleChange = (value) => {
    this.setState({ new_device_json: value });
  };

  handleEdit = (value) => {
    this.setState({ edited_device: value });
  }

  showModalEditor = (caption, thing_json) => {
    Modal.confirm({
      title: caption,
      width: 800,
      height: 800,
      content: <Editor value={thing_json} onChange={this.handleChange} />,
      onOk: () => {
        this.createDevice(this.state.new_device_json);
        this.setState({});
      },
      onCancel: () => {
        this.setState({});
      },
    });
  };

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
    console.log('DEVICE FEATURES: ', features);
    console.log('DEVICE ID: ', this.state.edited_device._thingId);
    const featuresHandle = this.context.ditto_client.getFeaturesHandle(this.state.edited_device._thingId);
    featuresHandle
      .putFeatures(features, )
      .then((result) =>
        console.log(
          `Finished updating the device with result: ${JSON.stringify(result)}`
        )
      );
  }

  startTrustAgent = async (thingId) => {
    //const featuresHandle = this.context.ditto_client.getFeaturesHandle(thingId);
    //console.info(featuresHandle.getProperties("trustAgent"));
    //featuresHandle.putProperties("trustAgent", {
    //  version: "hi there!",
    //  status: "oh no",
    //});

    // TODO: send an MQTT message to an adapter
    console.info("Sending a MQTT message to start the trust agent");
  };

  stopTrustAgent = async (thingId) => {
    //const featuresHandle = this.context.ditto_client.getFeaturesHandle(thingId);
    //console.info(featuresHandle.getProperties("trustAgent"));
    //featuresHandle.putProperties("trustAgent", {
    //  version: "hi there!",
    //  status: "oh no",
    //});

    // TODO: send an MQTT message to an adapter
    console.info("Sending a MQTT message to stop the trust agent");
  };

  rollbackTrustAgent = async (thingId) => {
    //const featuresHandle = this.context.ditto_client.getFeaturesHandle(thingId);
    //console.info(featuresHandle.getProperties("trustAgent"));
    //featuresHandle.putProperties("trustAgent", {
    //  version: "hi there!",
    //  status: "oh no",
    //});

    // TODO: send an MQTT message to an adapter
    console.info("Sending a MQTT message to roll back the trust agent");
  };
}
