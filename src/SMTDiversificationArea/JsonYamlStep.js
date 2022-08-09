import React, { Component } from "react";
import ReactJson from "react-json-view";
import AceEditor from "react-ace";
import yaml from "js-yaml";
import readYaml from "read-yaml";
import yaml_model from "../resources/sample_input.yml";
import { DiversificationContext } from "./DiversificationContext";

import "ace-builds/src-noconflict/mode-sass";
import "ace-builds/src-noconflict/theme-github";

import { Col, Row, Typography, Upload, Button, Icon } from "antd";

const { Title } = Typography;

export class JsonYamlStep extends Component {
  static contextType = DiversificationContext;

  constructor(props) {
    super(props);
    this.state = {
      // TODO: get rid of locally stored variables, everything should be managed through the Global/Diversification contexts!
      json_model: require("../resources/sample_input.json"),
    };
  }

  handleEdit = (value) => {
    this.setState({ json_model: value.updated_src });
    this.context.setJsonInput(value);
    console.log(this.state.json_model);
  };

  handleJsonChange = (value) => {
    //this.setState({ json_model: value });
    this.context.setJsonInput(value);
  };

  handleYamlChange = (value) => {
    //this.setState({ yaml_model: value });
    this.context.setYamlInput(value);
  };

  render() {
    
    const json_upload_props = {
      name: "json-input",
      accept: ".json",
      multiple: false,
      beforeUpload: (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          console.log(e.target.result);
          this.context.setJsonInput(e.target.result);
        };
        reader.readAsText(file);

        // Prevent upload
        return false;
      },
    };

    const yaml_upload_props = {
      name: "yaml-input",
      accept: ".yaml,.yml",
      multiple: false,
      beforeUpload: (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          console.log(e.target.result);
          this.context.setYamlInput(e.target.result);
        };
        reader.readAsText(file);

        // Prevent upload
        return false;
      },
    };

    return (
      <Row gutter={10}>
        <Col span={12}>
          <Title level={4}>
            Verify the input JSON model{"  "}
            <Upload {...json_upload_props}>
              <Button>
                <Icon type="upload" /> Upload new
              </Button>
            </Upload>
          </Title>
          {/* <div id="" style={{overflow: "scroll", height: "400px"}} > */}
          <ReactJson
          //FIXME: fix the source for json editor
            src={this.context.json_input} //{Object.assign(this.context.deployment_list,this.context.device_list)}
            theme="apathy:inverted"
            collapsed={2}
            enableClipboard={true}
            onEdit={this.handleEdit} //handleJsonChange
            onAdd={this.handleEdit} //handleJsonChange
            onDelete={this.handleEdit} //handleJsonChange
          />
          {/* </div> */}
        </Col>
        <Col span={12}>
          <Title level={4}>Verify the input YAML model{"  "}
            <Upload {...yaml_upload_props}>
              <Button>
                <Icon type="upload" /> Upload new
              </Button>
            </Upload></Title>
          {/* <div id="" style={{overflow: "scroll", height: "400px"}} > */}
          <AceEditor
            mode="sass"
            //theme="github"
            width="100%"
            onChange={this.handleYamlChange}
            name="yaml_view"
            editorProps={{ $blockScrolling: true }}
            value={this.context.yaml_input}
            //   Object.assign(
            //     this.context.deployment_list,
            //     this.context.device_list
            //   )
            // )}
          />
          {/* </div> */}
        </Col>
      </Row>
    );
  }

  componentDidMount() {
    //TODO:
  }
}
