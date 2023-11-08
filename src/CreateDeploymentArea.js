import React, { Component } from "react";
import {
  Button,
  Layout,
  Col,
  Row,
  Table,
  Badge,
  Tooltip,
  Select,
  Steps,
  message,
  Form,
  Input,
  Icon,
  Checkbox,
} from "antd";
import ReactJson from "react-json-view";
import winston_logger from "./logger.js";
import { GlobalContext } from "./GlobalContext.js";
import {
  Thing,
  DefaultSearchOptions,
} from "@eclipse-ditto/ditto-javascript-client-dom";

const logger = winston_logger.child({ source: "CreateDeploymentArea.js" });

const { Content } = Layout;
const ButtonGroup = Button.Group;
const { Option } = Select;
const { Step } = Steps;
const { TextArea } = Input;

let id = 0;

const CustomizedForm = Form.create({
  name: "rql_expression",
  onFieldsChange(props, changedFields) {
    props.onChange(changedFields);
  },
  mapPropsToFields(props) {
    return {
      rql: Form.createFormField({
        ...props.rql,
        value: props.rql.value,
      }),
    };
  },
  onValuesChange(_, values) {
    console.log(values);
  },
})((props) => {
  const { getFieldDecorator } = props.form;
  return (
    <Form layout="inline">
      <Form.Item
        label="RQL expression"
        wrapperCol={{ sm: 24 }}
        style={{ width: "100%" }}
      >
        {getFieldDecorator("rql", {
          rules: [{ required: true, message: "RQL expression is required!" }],
        })(
          <TextArea
            rows={4}
            size="large"
            suffix={
              <Tooltip
                title={
                  <a href="https://connect.cloudblue.com/community/developers/api/rql/">
                    More about RQL
                  </a>
                }
              >
                <Icon type="info-circle" />
              </Tooltip>
            }
            allowClear
          />
        )}
      </Form.Item>
    </Form>
  );
});

export class CreateDeploymentArea extends Component {
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
          <span>
            <Badge
              status={
                record._attributes.type === "physical_device"
                  ? "processing"
                  : "default"
              }
            />
            {record._thingId}
          </span>
        ),
      },
    ];
    this.state = {
      //add if needed
      current: 0,
      save: false,
      deployment_name: "",
      current_agent: {},
      new_deployment: require("./resources/deployment_template.json"),
      matching_devices: [],
      new_assignment_json: require("./resources/cps_assignment_template.json"),
      fields: {
        rql: {
          value:
            "in(attributes/type,'device','physical_device','virtual_device')",
        },
      },
    };
    this.editor = React.createRef();
  }

  handleDeploy = (values) => {
    console.log("values: ", values);
    this.state.matching_devices.forEach((device) => {
      const featuresHandle = this.context.ditto_client.getFeaturesHandle(
        device.thingId
      );
      let trust_agent = {
        container_image: this.state.current_agent._attributes.image,
        container_version: this.state.current_agent._attributes.version,
        container_status: "running",
        ta_meta: this.state.current_agent._attributes,
      };
      featuresHandle
        .putDesiredProperty("cyber", "trustAgent", trust_agent)
        .then((result) =>
          logger.info(device._thingId + 
            `Finished updating the device twin with result: ${JSON.stringify(
              result
            )}`
          )
        );
    });
    if (this.state.save && this.state.deployment_name !== "") {
      this.saveDeployment();
    }
    message.success("Deployment complete!")
    this.setState({current: 0, deployment_name: "", current_agent: {}, matching_devices: [],  save: false})

  };

  saveDeployment = () => {

    let json = this.state.new_deployment;
    json.thingId = "no.sintef.sct.giot:" + this.state.deployment_name;
    json.attributes.trust_agent_id = this.state.current_agent._thingId;
    json.attributes.rql_expression = this.state.fields.rql.value;

    let deployment = Thing.fromObject(json);

    const thingsHandle = this.context.ditto_client.getThingsHandle();
    thingsHandle
      .putThing(deployment)
      .then((result) =>
        logger.info(
          `Finished putting the new deployment with the result: ${JSON.stringify(
            result
          )}`
        )
      );
  }

  render() {
    const { current, selected_tags, fields } = this.state;

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
        title: "Define target conditions",
        content: (
          <CustomizedForm {...fields} onChange={this.handleFormChange} />
        ),
      },
      {
        title: "Confirm matching devices",
        content: (
          <Table
            //bordered
            rowKey={(record) => record.id}
            size="small"
            dataSource={this.state.matching_devices}
            columns={this.columns}
            pagination={{ pageSize: 50 }}
            //scroll={{ y: 500 }}
            //expandRowByClick={true}
            expandedRowRender={(record) => (
              <ReactJson src={record} enableClipboard={false} collapsed="1" />
            )}
          />
        ),
      },
    ];

    return (
      <Layout>
        <Content>
          <Row>
            <Col
              style={{
                marginTop: 16,
                marginBottom: 16,
                marginLeft: 24,
                marginRight: 24,
              }}
            >
              <Steps current={current}>
                {steps.map((item) => (
                  <Step key={item.title} title={item.title} />
                ))}
              </Steps>
              <div className="steps-content">{steps[current].content}</div>
              <div
                className="steps-action"
                style={{ display: "flex", justifyContent: "center" }}
              >
                {current < steps.length - 1 && (
                  <Button type="primary" onClick={() => this.next()}>
                    Next
                  </Button>
                )}
                {current === steps.length - 1 && (
                  <Button
                    type="primary"
                    onClick={this.handleDeploy}
                  >
                    Deploy
                  </Button>
                )}
                {current > 0 && (
                  <Button style={{ marginLeft: 8 }} onClick={() => this.prev()}>
                    Previous
                  </Button>
                )}
              </div>
              <div
                className="save-action"
                style={{ display: "flex", justifyContent: "center" }}
              >
                {current === steps.length - 1 && (
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <Checkbox onChange={this.onCheckboxChange}>
                      Save deployment
                    </Checkbox>
                    <Input
                      placeholder="Deployment name"
                      onChange={this.onDeploymentNameChange}
                      disabled={!this.state.save}
                    ></Input>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Content>
      </Layout>
    );
  }

  componentDidMount() {
    //add if needed
  }
  
  handleFormChange = (changedFields) => {
    this.setState(({ fields }) => ({
      fields: { ...fields, ...changedFields },
    }));
    //logger.info("changed fields" + JSON.stringify(changedFields));
    //logger.info(" fields" + JSON.stringify(this.state.fields));
  };

  onCheckboxChange = (e) => {
    //logger.info(`checked = ${e.target.checked}`);
    this.setState({ save: e.target.checked });
  };

  onDeploymentNameChange = (e) => {
    //logger.debug(JSON.stringify(e.target.value))
    this.setState({ deployment_name: e.target.value });
  };

  next() {
    logger.info(this.state.current);
    const current = this.state.current + 1;
    if (current === 2) {
      this.handleFormChange();
      logger.debug("RQL query is: " + this.state.fields.rql.value);
      this.findMatchingDevices(
        this.state.current_agent,
        this.state.fields.rql.value
      ).then((result) => this.setState({ matching_devices: result }));
    }
    this.setState({ current });
    logger.info("Next", current);
  }

  prev() {
    const current = this.state.current - 1;
    this.setState({ current });
    logger.info("Prev", current);
  }  

  /**
   * Find matching devices in Ditto according to the RQL query
   */
  findMatchingDevices = async (trustAgent, rqlExpression) => {
    const searchHandle = this.context.ditto_client.getSearchHandle();

    var options = DefaultSearchOptions.getInstance()
      .withFilter(rqlExpression)
      .withSort("+thingId")
      .withLimit(0, 200);
    //searchHandle.search(options).then(result => console.log("returned",result.items))
    var devices = (await searchHandle.search(options)).items;
    //console.info(devices);
    logger.debug("Found matching devices: " + JSON.stringify(devices));
    return devices;
  };

  /** Deploys the selected trust agent to all suitable devices */
  assignTrustAgentToAll = async (trustAgent, rqlExpression) => {
    //FIXME: what if a device has both docker and ssh?
    //FIXME: there must only one check whether the device is suitable
    this.context.devices.forEach((device) => {
      const featuresHandle = this.context.ditto_client.getFeaturesHandle(
        device.thingId
      );
      if (trustAgent._attributes.type === "trust_agent_docker") {
        let trust_agent = {
          container_image: trustAgent._attributes.image,
          container_version: trustAgent._attributes.version,
          container_status: "running",
          ta_meta: trustAgent._attributes,
        };
        featuresHandle
          .putDesiredProperty("cyber", "trustAgent", trust_agent)
          .then((result) =>
            logger.info(
              `Finished updating the device twin with result: ${JSON.stringify(
                result
              )}`
            )
          );
      } else if (trustAgent._attributes.type === "trust_agent_ssh") {
        let trust_agent = {
          process_name: "trust-agent.sh",
          process_status: "running",
          ta_meta: trustAgent._attributes,
        };
        featuresHandle
          .putDesiredProperty("cyber", "trustAgent", trust_agent)
          .then((result) =>
            logger.info(
              `Finished updating the device twin with result: ${JSON.stringify(
                result
              )}`
            )
          );
      } else {
        logger.info(
          device._thingId + " is not suitable for " + trustAgent._thingId
        );
      }
    });
  };

  handleDropdownChange = (value) => {
    //logger.info("value", value);
    //logger.info("trust_agent", this.state.trust_agent);
    this.setState({ current_agent: JSON.parse(value) });
  };
}
