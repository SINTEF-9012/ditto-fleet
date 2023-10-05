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
  Popconfirm,
  Select,
  Steps,
  message,
  Tag,
} from "antd";
import ReactJson from "react-json-view";
import winston_logger from "./logger.js";
import Axios from "axios";
import { GlobalContext } from "./GlobalContext";
import { Thing } from "@eclipse-ditto/ditto-javascript-client-dom";

const logger = winston_logger.child({ source: "AssignmentArea.js" });

const { CheckableTag } = Tag;
const { Content } = Layout;
const ButtonGroup = Button.Group;
const { Option } = Select;
const { Step } = Steps;

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
            <ButtonGroup size="small" type="dashed">
              <Tooltip title="Create an assignment from a trust agent">
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
      current: 0,
      modal: false,
      current_agent: null,
      cyber_properties: [],
      physical_properties: [],
      social_properties: [],
      selected_tags: [],
      new_assignment_json: require("./resources/cps_assignment_template.json"),
    };
    this.editor = React.createRef();
  }

  render() {
    const { current, selected_tags } = this.state;

    const steps = [
      {
        title: "Select a trust agent",
        content: (
          <>
            <Select
              style={{ width: "100%" }}
              onSelect={this.handleDropdownChange}
            >
              {this.context.trust_agents.map((item) => (
                <Option key={item._thingId} value={JSON.stringify(item)}>
                  {item._thingId}
                </Option>
              ))}
            </Select>
            <ReactJson src={this.state.current_agent} />
          </>
        ),
      },
      {
        title: "Select context requirements",
        content: (
          <>
            {/* this.context.cyber_properties.forEach(function (entry) {
      logger.info(entry);
    }); */}
            {this.context.cyber_properties.map((item) => (
              <CheckableTag
                key={item}
                checked={selected_tags.indexOf(item) > -1}
                onChange={(checked) => this.handleTagChange(item, checked)}
              >
                {item}
              </CheckableTag>
            ))}
          </>
        ),
      },
      {
        title: "Check target devices",
        content: "Last-content",
      },
      {
        title: "Confirm and save",
        content: "Last-content",
      },
    ];

    return (
      <Layout>
        <Content>
          <Row type="flex" justify="end">
            <Col>
              <Button
                type="primary"
                style={{ marginTop: 16, marginBottom: 16, marginRight: 16 }}
                onClick={this.showModal}
              >
                New assignment
              </Button>
              <Modal
                title="Basic Modal"
                visible={this.state.modal}
                onOk={this.handleOk}
                onCancel={this.handleCancel}
                footer={[]}
              >
                <Steps current={current}>
                  {steps.map((item) => (
                    <Step key={item.title} title={item.title} />
                  ))}
                </Steps>
                <div className="steps-content">{steps[current].content}</div>
                <div className="steps-action">
                  {current < steps.length - 1 && (
                    <Button type="primary" onClick={() => this.next()}>
                      Next
                    </Button>
                  )}
                  {current === steps.length - 1 && (
                    <Button
                      type="primary"
                      onClick={() => message.success("Processing complete!")}
                    >
                      Done
                    </Button>
                  )}
                  {current > 0 && (
                    <Button
                      style={{ marginLeft: 8 }}
                      onClick={() => this.prev()}
                    >
                      Previous
                    </Button>
                  )}
                </div>
              </Modal>
              {/* <Button
                type="primary"
                style={{ marginTop: 16, marginBottom: 16, marginRight: 16 }}
              >
                New assignment
              </Button> */}
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
    //this.populatePropertyTags();
    //setTimeout(function () {
    this.context.cyber_properties.forEach(function (entry) {
      logger.info(entry);
    });
    //}, 1000);
    logger.info(this.context.cyber_properties);
  }

  populatePropertyTags() {
    let cyber_properties = new Set();
    this.context.devices.forEach((device) => {
      if (device._features.hasOwnProperty("cyber")) {
        Object.entries(device._features.cyber._properties).forEach(
          ([key, value]) => {
            cyber_properties.add(key);
            //logger.info(key);
          }
        );
      }
    });
    cyber_properties.forEach(function (entry) {
      logger.info(entry);
    });
    this.setState({ cyber_properties: cyber_properties });
  }

  showModal = () => {
    this.setState({
      modal: true,
    });
  };

  handleOk = (e) => {
    logger.info(e);
    this.setState({
      modal: false,
    });
  };

  handleCancel = (e) => {
    logger.info(e);
    this.setState({
      modal: false,
    });
  };

  handleTagChange(tag, checked) {
    const { selectedTags } = this.state;
    const nextSelectedTags = checked
      ? [...selectedTags, tag]
      : selectedTags.filter((t) => t !== tag);
    console.log("You are interested in: ", nextSelectedTags);
    this.setState({ selectedTags: nextSelectedTags });
  }

  next() {
    logger.info(this.state.current);
    const current = this.state.current + 1;
    this.setState({ current });
    logger.info("Next", current);
  }

  prev() {
    const current = this.state.current - 1;
    this.setState({ current });
    logger.info("Prev", current);
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

  handleDropdownChange = (value) => {
    //logger.info("value", value);
    //logger.info("trust_agent", this.state.trust_agent);
    this.setState({ current_agent: JSON.parse(value) });
  };

  executeAssignment = async (assignmentId) => {
    //TODO:
  };
}
