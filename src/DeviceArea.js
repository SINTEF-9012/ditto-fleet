import React, { Component } from "react";
import { Button, Layout, Col, Row, Table, Tooltip, Badge, Modal } from "antd";
import ReactJson from "react-json-view";
import { GlobalContext } from "./GlobalContext";
import { Thing } from "@eclipse-ditto/ditto-javascript-client-node";
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
        width: 100,
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
          <span style={{ float: "right" }}>
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
              <Tooltip title="Deploy trust agent">
                <Button
                  type="primary"
                  icon="cloud-download"
                  onClick={() =>
                    Modal.confirm({
                      title: "Deploy a trust agent on: " + record.id,
                      onOk: () => {
                        this.deployTrustAgent(record.id, null);
                      },
                      onCancel: () => {
                        this.setState({ payload: "Hello world!" });
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
                  onClick={() =>
                    Modal.confirm({
                      title: "Start a trust agent on: " + record.id,
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
              </Tooltip>
              <Tooltip title="Delete device twin">
                <Button
                  type="primary"
                  icon="delete"
                  onClick={() => this.deleteThing(record.id)}
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
      new_thing_json: require('./resources/thing_template.json')
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
                    title: "Create a new thing in Eclipse Ditto",
                    content: (
                      // <ReactJson src={{'thingId':'no.sintef.sct.giot:newThing', 'policyId': 'no.sintef.sct.giot:policy'}} enableClipboard={true} />
                      <Editor value={this.state.new_thing_json} onChange={this.handleChange} />
                    ),
                    onOk: () => {
                      this.createNewThing(this.state.new_thing_json);
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

  handleChange = value => {
    this.setState({ new_thing_json: value });
  };

  createNewThing = async () => {
    //var json = require("./resources/thing_template.json");
    const thing = Thing.fromObject(this.state.new_thing_json);
    console.log(thing);
    const thingsHandle = this.context.ditto_client.getThingsHandle();
    thingsHandle
      .putThing(thing)
      .then((result) =>
        console.log(
          `Finished putting the new thing with result: ${JSON.stringify(
            result
          )}`
        )
      );
  };

  deleteThing = async (thingId) => {
    const thingsHandle = this.context.ditto_client.getThingsHandle();
    thingsHandle
      .deleteThing(thingId)
      .then((result) =>
        console.log(
          `Finished deleting the thing with result: ${JSON.stringify(result)}`
        )
      );
  };

  deployTrustAgent = async (thingId, trust_agent) => {
    //const featuresHandle = this.context.ditto_client.getFeaturesHandle(thingId);
    //console.info(featuresHandle.getProperties("trustAgent"));
    //featuresHandle.putProperties("trustAgent", {
    //  version: "hi there!",
    //  status: "oh no",
    //});

    // TODO: send an MQTT message to an adapter
    console.info("Sending a MQTT message to deploy a trust agent");
  };

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
