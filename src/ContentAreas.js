import React, { Component } from "react";
import {
  Button,
  List,
  Col,
  Row,
  Select,
  Typography,
  InputNumber,
  Icon,
  Popover
} from "antd";
import axios from "axios";
import ReactJson from "react-json-view";

const { Text } = Typography;

export var ContentAreaEnum = {
  DEPLOYMENTDEVICE: 1,
  PRODUCTION: 2,
  PREVIEW: 3,
  DIVERSIFY: 4,
  DEFAULT: 5,
  properties: {
    1: { name: "deploymentdevice", value: 1, code: "D" },
    2: { name: "production", value: 2, code: "P" },
    3: { name: "preview", value: 3, code: "R" },
    4: { name: "diversify", value: 4, code: "V" },
    5: { name: "default", value: 5, code: "F" }
  }
};

export class SingleVariantSelect extends Component {
  constructor(props) {
    super(props);
    this.state = {
      variants: [],
      selected: null
    };
  }
  componentDidMount() {
    this.getVariantIds().then(result => {
      this.setState({ variants: result });
    });
  }

  async getVariantIds() {
    return (await axios.get("api/variant")).data.map(item => {
      return item.id;
    });
  }
  render() {
    return (
      <Select
        style={{ width: 150 }}
        onChange={this.props.onSelectionChange}
        placeholder="Select a variant"
      >
        {this.state.variants.map((value, index) => {
          return <Select.Option value={value}>{value}</Select.Option>;
        })}
      </Select>
    );
  }
}

export class MultiVariantSelect extends SingleVariantSelect {
  render() {
    return (
      <Select
        mode="multiple"
        style={{ width: 150 }}
        onChange={this.props.onSelectionChange}
        placeholder="Select a variant"
      >
        {this.state.variants.map((value, index) => {
          return <Select.Option value={value}>{value}</Select.Option>;
        })}
      </Select>
    );
  }
}

export class ProductionArea extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: null,
      contentarea: -1
    };
    this.deploymentdevice = React.createRef();
  }

  componentDidMount() {}

  onSelectionChange = async value => {
    this.setState({ selected: value });
  };

  onGoButton = async () => {
    const variant = this.state.selected;
    if (!variant) {
      window.confirm("Please select a variant first");
      return;
    }
    await axios.put(`api/global/production/${variant}`);
    this.setState({
      contentarea: ContentAreaEnum.DEPLOYMENTDEVICE
    });
    this.deploymentdevice.current.componentDidMount();
  };

  render() {
    return (
      <div>
        <Row>
          <Text>Put variant </Text>
          <SingleVariantSelect onSelectionChange={this.onSelectionChange} />
          <Text> into production. </Text>
          <Button onClick={this.onGoButton}> Go </Button>
        </Row>
        {this.state.contentarea === ContentAreaEnum.DEPLOYMENTDEVICE && (
          <Row>
            <DeploymentDeviceArea ref={this.deploymentdevice} />
          </Row>
        )}
      </div>
    );
  }
}

export class PreviewArea extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: null,
      number: 1,
      devices: [],
      contentarea: -1
    };
    this.deploymentdevice = React.createRef();
  }

  componentDidMount() {
    this.getDevices().then(result => {
      this.setState({ devices: result });
    });
  }

  onSelectionChange = async value => {
    this.setState({ selected: value });
  };

  onNumberChange = async value => {
    this.setState({ number: value });
  };

  getDevices = async () => {
    return (await axios.get("api/device/")).data;
  };

  onGoButton = async () => {
    const variant = this.state.selected;
    if (!variant) {
      window.confirm("Please select a variant first");
      return;
    }
    await axios.put(`api/global/previewold/${variant}`, {
      random: this.state.number
    });
    this.setState({
      contentarea: ContentAreaEnum.DEPLOYMENTDEVICE
    });
    this.deploymentdevice.current.componentDidMount();
  };

  render() {
    const devices = this.state.devices;
    return (
      <div>
        <Row>
          <Text>Preview variant</Text>
          <SingleVariantSelect onSelectionChange={this.onSelectionChange} />
          <Text> on </Text>
          <InputNumber
            min={1}
            max={devices.length}
            onChange={this.onNumberChange}
          />
          <Text> devices. </Text>
          <Button onClick={this.onGoButton}> Go </Button>
        </Row>
        {this.state.contentarea === ContentAreaEnum.DEPLOYMENTDEVICE && (
          <Row>
            <DeploymentDeviceArea ref={this.deploymentdevice} />
          </Row>
        )}
      </div>
    );
  }
}

export class DiversifyArea extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: null,
      contentarea: -1
    };
    this.deploymentdevice = React.createRef();
  }

  componentDidMount() {}

  onSelectionChange = async value => {
    this.setState({ selected: value });
  };

  onGoButton = async () => {
    const variants = this.state.selected;
    window.confirm(variants);
    if (!variants) {
      window.confirm("Please select a variant first");
      return;
    }
    await axios.put(`api/global/shuffle`, { variants: variants });
    this.setState({
      contentarea: ContentAreaEnum.DEPLOYMENTDEVICE
    });
    this.deploymentdevice.current.componentDidMount();
  };

  render() {
    return (
      <div>
        <Row>
          <Text>Diversify variants </Text>
          <MultiVariantSelect onSelectionChange={this.onSelectionChange} />
          <Text> into all devices </Text>
          <Button onClick={this.onGoButton}> Go </Button>
        </Row>
        {this.state.contentarea === ContentAreaEnum.DEPLOYMENTDEVICE && (
          <Row>
            <DeploymentDeviceArea ref={this.deploymentdevice} />
          </Row>
        )}
      </div>
    );
  }
}

export class DeploymentDeviceArea extends Component {
  constructor(props) {
    super(props);
    this.state = {
      deployments: [],
      devices: []
    };
  }

  componentDidMount() {
    this.getDeployments().then(result =>
      this.setState({ deployments: result })
    );
    this.getDevices().then(result => this.setState({ devices: result }));
  }

  getHover = (title, record) => {
    return (
      <Popover content={<ReactJson src={record} />} title={title}>
        <a>{title}</a>
      </Popover>
    );
  };

  render() {
    const { deployments, devices } = this.state;

    return (
      <Row>
        <Col span={10}>
          {/* List of deployments in Cosmos DB */}
          <List
            size="small"
            //header={<div>Header</div>}
            //footer={<div>Footer</div>}
            bordered
            dataSource={deployments}
            renderItem={deployment => (
              <List.Item>
                <Icon type="deployment-unit" />{" "}
                {this.getHover(deployment.id, deployment)}
              </List.Item>
            )}
          />
        </Col>
        <Col span={10}>
          <List
            size="small"
            //header={<div>Header</div>}
            //footer={<div>Footer</div>}
            bordered
            dataSource={devices}
            renderItem={device => (
              <List.Item>
                <Icon type="gateway" /> {this.getHover(device.id, device)}
              </List.Item>
            )}
          />
        </Col>
        <Col span={4}></Col>
      </Row>
    );
  }

  async getDevices() {
    return (await axios.get("api/device/")).data;
  }

  async getDeployments() {
    return (await axios.get("api/deployment")).data;
  }
}
