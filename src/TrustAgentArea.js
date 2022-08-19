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
      new_trust_agent_json: require("./resources/trust_agent_template.json"),
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
                    title: "Create a new trust agent in Eclipse Ditto",
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
                      this.setState({ payload: "Hello world!" });
                    },
                  })
                }
              >
                Register new trust agent
              </Button>
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
    this.setState({ new_trust_agent_json: value });
  };

  createTrustAgent = async () => {
    //var json = require("./resources/thing_template.json");
    const trust_agent = Thing.fromObject(this.state.new_trust_agent_json);
    console.log(trust_agent);
    const thingsHandle = this.context.ditto_client.getThingsHandle();
    thingsHandle
      .putThing(trust_agent)
      .then((result) =>
        console.log(
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
        console.log(
          `Finished deleting the trust agent with result: ${JSON.stringify(
            result
          )}`
        )
      );
  };
}
