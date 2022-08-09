import React, { Component } from "react";
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python.js";
import "prismjs/themes/prism.css";
import {
  Col,
  Row,
  Typography,
  Button,
  message,
  Upload,
  Icon,
  Radio,
  Collapse,
} from "antd";
import { DiversificationContext } from "./DiversificationContext";

const { Title } = Typography;

const { Panel } = Collapse;

export class SMTStep extends Component {
  static contextType = DiversificationContext;

  constructor(props) {
    super(props);
    this.state = {
      radioValue: 0,
      //code: code,
    };
  }

  handleRadioChange = (e) => {
    this.setState({ radioValue: e.target.value });
  };

  handleCodeChange = (value) => {
    this.setState({ value });
    this.context.setSmtInput(value);
  };

  render() {
    //const { selectedFile } = this.state;
    const radioStyle = {
      display: "block",
      height: "30px",
      lineHeight: "30px",
    };
    const props = {
      name: "smt-file",
      accept: ".py",
      multiple: false,
      // onRemove: file => {
      //   this.setState(state => {
      //     const index = state.fileList.indexOf(file);
      //     const newFileList = state.fileList.slice();
      //     newFileList.splice(index, 1);
      //     return {
      //       fileList: newFileList
      //     };
      //   });
      // },
      beforeUpload: (file) => {
        //this.setState((state) => ({
        //  selectedFile: file,
        //}));

        const reader = new FileReader();
        reader.onload = (e) => {
          console.log(e.target.result);
          this.context.setSmtInput(e.target.result);
        };
        reader.readAsText(file);

        // Prevent upload
        return false;
      },
      //selectedFile,
      //action: "/api/z3/",
      // onChange(info) {
      //   const { status } = info.file;
      //   if (status !== "uploading") {
      //     console.log(info.file);
      //   }
      //   if (status === "done") {
      //     this.setState({ selectedFile: info.file });
      //     message.success(`${info.file.name} file uploaded successfully.`);
      //     console.log(this.state.selectedFile);
      //   } else if (status === "error") {
      //     message.error(`${info.file.name} file upload failed.`);
      //   }
      // },
    };

    return (
      <DiversificationContext.Consumer>
        {({ z3_solution }) => (
          <Row>
            <Col span={24}>
              <Title level={4}>SMT constraints for Z3 solver</Title>

              <Radio.Group
                onChange={this.handleRadioChange}
                value={this.state.radioValue}
              >
                <Radio style={radioStyle} value={0}>
                  Default assignment logic
                </Radio>
                <Radio style={radioStyle} value={1}>
                  Define your own SMT logic
                </Radio>
              </Radio.Group>

              <Collapse ghost activeKey={this.state.radioValue}>
                <Panel
                  header={
                    <Upload {...props}>
                      <Button disabled={!this.state.radioValue}>
                        <Icon type="upload" /> Click to Upload
                      </Button>
                    </Upload>
                  }
                  key="1"
                  disabled={!this.state.radioValue}
                >
                  <Editor
                    value={this.context.smt_input}
                    onValueChange={(code) => this.handleCodeChange(code)} //this.setState({ code })}
                    highlight={(code) => highlight(code, languages.py)}
                    padding={10}
                    style={{
                      fontFamily: '"Fira code", "Fira Mono", monospace',
                      fontSize: 12,
                    }}
                  />
                </Panel>
              </Collapse>

              {/* <Row>
            <Dragger {...z3_props}>
              <p className="ant-upload-drag-icon">
                <Icon type="inbox" />
              </p>
              <p className="ant-upload-text">
                Click or drag fyour Z3 python script to upload
              </p>
            </Dragger>
          </Row> */}
            </Col>
          </Row>
        )}
      </DiversificationContext.Consumer>
    );
  }

  componentDidMount() {
    //TODO
  }
}
