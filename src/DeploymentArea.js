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

const logger = winston_logger.child({ source: "DeploymentArea.js" });

const { CheckableTag } = Tag;
const { Content } = Layout;
const ButtonGroup = Button.Group;
const { Option } = Select;
const { Step } = Steps;

export class DeploymentArea extends Component {
  static contextType = GlobalContext;

  constructor(props) {
    super(props);
    this.columns = [
      {
        title: "Deployment ID",
        dataIndex: "_thingId",
        align: "left",
        render: (text, record) => (
          <span>
            <Badge status="success" />
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
            <ButtonGroup size="small" type="dashed">
            <Tooltip title="Enact deployment">
                <Button
                  type="primary"
                  icon="rocket"
                  onClick={() =>
                    Modal.confirm({
                      title: "Enact deployment: " + record.id,
                      width: 800,
                      onOk: () => {
                        this.enactDeployment(record.id);
                      }
                    })
                  }
                  ghost
                />
              </Tooltip>
              <Tooltip title="Delete deployment">
                <Button
                  type="primary"
                  icon="delete"
                  onClick={() =>
                    Modal.confirm({
                      title: "Delete deployment: " + record.id,
                      width: 800,
                      onOk: () => {
                        this.deleteDeployment(record.id);
                      }
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
      current: 0
    };
    this.editor = React.createRef();
  }

  render() {
    return (
      <Layout>
        <Content>
          <Row type="flex" justify="end">
            <Col> 
              <Popconfirm
                title="Delete all deployments?"
                onConfirm={this.deleteAllDeployments}
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
                dataSource={this.context.deployments}
                columns={this.columns}
                pagination={{ pageSize: 50 }}
                //scroll={{ y: 500 }}
                //expandRowByClick={true}
                expandedRowRender={(record) => (
                  <span>
                    <ReactJson src={record} enableClipboard={false} />                    
                  </span>
                )}
              />
            </Col>
          </Row>
        </Content>
      </Layout>
    );
  }

  componentDidMount() {}

  /** Deletes selected deployment from Ditto */
  deleteDeployment = async (thingId) => {
    const thingsHandle = this.context.ditto_client.getThingsHandle();
    thingsHandle
      .deleteThing(thingId)
      .then((result) =>
        logger.info(
          `Finished deleting the deployment with the result: ${JSON.stringify(
            result
          )}`
        )
      );
  };

  /** Deletes all deployments from Ditto */
  deleteAllDeployments = async () => {
    this.context.deployments.forEach((deployment) => {
      //logger.info(deployment._thingId);
      this.deleteDeployment(deployment._thingId);
    });
  };
  

  /* createAssignment = async () => {
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
  }; */  

  enactDeployment = async (thingId) => {
    //TODO:
    logger.debug("Enacting deployment: " + thingId)
  };
}
