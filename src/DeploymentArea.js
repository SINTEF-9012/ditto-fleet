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
  message,
} from "antd";
import ReactJson from "react-json-view";
import winston_logger from "./logger.js";
import { GlobalContext } from "./GlobalContext";
import { DefaultSearchOptions } from "sintef-ditto-javascript-client-dom";

const { logTimestampJS } = require("./TimestampLogger");

const logger = winston_logger.child({ source: "DeploymentArea.js" });

const { Content } = Layout;
const ButtonGroup = Button.Group;

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
                <Popconfirm
                  title={"Enact deployment: " + record.id}
                  onConfirm={() => this.enactDeployment(record)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="primary" icon="rocket" ghost />
                </Popconfirm>
              </Tooltip>
              <Tooltip title="Delete deployment">
                <Popconfirm
                  title={"Delete deployment: " + record.id}
                  onConfirm={() => this.deleteDeployment(record.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="primary" icon="delete" ghost />
                </Popconfirm>
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
      matching_device: [],
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

  /** Apply the selected to deployment to matching devices */
  enactDeployment = async (deployment) => {

    logTimestampJS({
      workflowId: "wf001",
      step: "enactDeployment",
      event: "start"
    });
    
    logger.debug("Enacting deployment: " + deployment._thingId);
    //TODO:
    this.findMatchingDevices(deployment._attributes.rql_expression).then(
      (result) =>
        this.handleDeploy(deployment._attributes.trust_agent_id, result)
    );
    message.success("Deployment complete!");

    logTimestampJS({
      workflowId: "wf001",
      step: "enactDeployment",
      event: "finish"
    });
  };

  /**
   * Find matching devices in Ditto according to the RQL query
   */
  findMatchingDevices = async (rqlExpression) => {
    
    logTimestampJS({
      workflowId: "wf001",
      step: "findMatchingDevices",
      event: "start"
    });
    
    const searchHandle = this.context.ditto_client.getSearchHandle();
    var options = DefaultSearchOptions.getInstance()
      .withFilter(rqlExpression)
      .withSort("+thingId")
      .withLimit(0, 200);
    var devices = (await searchHandle.search(options)).items;
    logger.debug("Found matching devices: " + JSON.stringify(devices));

    logTimestampJS({
      workflowId: "wf001",
      step: "findMatchingDevices",
      event: "finish"
    });

    return devices;
  };

  /** Deploys the selected trust agent to the matching devices */
  handleDeploy = (trustAgentId, matchingDevices) => {
    
    logTimestampJS({
      workflowId: "wf001",
      step: "handleDeploy",
      event: "start"
    });

    let ta = this.context.trust_agents.find((x) => x._thingId === trustAgentId);
    logger.debug("Current trust agent: " + JSON.stringify(ta));
    matchingDevices.forEach((device) => {
      logger.debug("matching device: " + JSON.stringify(device));
      const featuresHandle = this.context.ditto_client.getFeaturesHandle(
        device._thingId
      );
      let trust_agent = {
        container_image: ta._attributes.image,
        container_version: ta._attributes.version,
        container_status: "running",
        ta_meta: ta._attributes,
      };
      logger.debug("ta: " + JSON.stringify(trust_agent));
      featuresHandle
        .putDesiredProperty("cyber", "trustAgent", trust_agent)
        .then((result) =>
          logger.info(
            device._thingId +
              `Finished updating the device twin with result: ${JSON.stringify(
                result
              )}`
          )
        );
    });

    logTimestampJS({
      workflowId: "wf001",
      step: "handleDeploy",
      event: "finish"
    });
  };
}
