import React, { Component } from "react";
import {
  Button,
  Layout,
  Col,
  Row,
  Table,
  Badge,
  Modal,
  Tooltip,
  Tag,
  Popconfirm
} from "antd";
import ReactJson from "react-json-view";
import { JsonEditor as Editor } from "jsoneditor-react";
import "jsoneditor-react/es/editor.min.css";
import winston_logger from "./logger.js";
import Axios from "axios";
import { GlobalContext } from "./GlobalContext";
import { Thing } from "@eclipse-ditto/ditto-javascript-client-dom";

const logger = winston_logger.child({ source: 'AssignmentArea.js' });

const { Content } = Layout;
const ButtonGroup = Button.Group;

export class AssignmentArea extends Component {
  static contextType = GlobalContext;

  constructor(props) {
    super(props);
    this.columns = [
      {
        title: "Assignment ID",
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
              <Tooltip title="Create an assignment">
                <Button
                  type="primary"
                  icon="deployment-unit"
                  onClick={() => this.createAssignment(record.id, record.id)}
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
      new_assignment_json: require("./resources/cps_assignment_template.json"),
    };
    this.editor = React.createRef();
  }

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
                    title: "Create a new assignment",
                    width: 800,
                    content: (
                      <Editor
                        value={this.state.new_assignment_json}
                        onChange={this.handleChange}
                      />
                    ),
                    onOk: () => {
                      this.createAssignment(this.state.new_assignment_json);
                    },
                    onCancel: () => {
                      //this.setState({ payload: "Hello world!" });
                    },
                  })
                }
              >
                New assignment
              </Button>
              <Popconfirm
                title="Delete all assignments? This will not affect already deployed software."
                onConfirm={this.deleteAllAssignments}
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
                dataSource={this.context.assignments}
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
    //add if needed
  }

  createAssignment = async () => {
    //var json = require("./resources/thing_template.json");
    const assignment = Thing.fromObject(this.state.new_assignment_json);
    logger.info(assignment);
    const thingsHandle = this.context.ditto_client.getThingsHandle();
    thingsHandle
      .putThing(assignment)
      .then((result) =>
        logger.info(
          `Finished putting the new assignment with result: ${JSON.stringify(
            result
          )}`
        )
      );
  };

  executeAssignment = async (assignmentId) => {
    //TODO:
  }
}
