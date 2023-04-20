import React, { Component } from "react";
import { Button, Layout, Col, Row, Table, Badge, Popconfirm } from "antd";
import ReactJson from "react-json-view";
import Axios from "axios";
import { GlobalContext } from "./GlobalContext";

const { Content } = Layout;

export class SandboxArea extends Component {
  static contextType = GlobalContext;

  constructor(props) {
    super(props);
    this.columns = [
      {
        title: "Trust Agent ID",
        dataIndex: "id",
        render: (record) =>
          this.context.appliedDevices[record] ? (
            <Badge count={this.context.appliedDevices[record].length}>
              {record}
            </Badge>
          ) : (
            <span>{record}</span>
          ),
      },
    ];
    this.nestedColumnsApplied = [
      {
        title: "Applied devices",
        dataIndex: "deviceId",
        render: (text, record) => (
          <Button
            type="link"
            icon="bulb"
            onClick={() => this.context.handleTabChange("4")}
          >
            {record.deviceId}
          </Button>
        ),
      },
    ];
    // this.nestedColumnsTargeted = [
    //   {
    //     title: 'Targeted devices',
    //     dataIndex: 'deviceId',
    //     render: (text, record) => (
    //       <Button type='link' icon='bulb' onClick={() => this.props.callbackTabChange('4')}>{record.deviceId}</Button>
    //     )
    //   }
    // ]
    this.state = {
      //add if needed
    };
    this.editor = React.createRef();
  }

  render() {
    //const { deployments, appliedDevices, targetedDevices } = this.state;

    return (
      <Layout>
        <Content>
          <Row>
            <Col span={24}>
              <Table
                //bordered
                rowKey={(record) => record.id}
                size="small"
                dataSource={this.context.deployments}
                columns={this.columns}
                expandRowByClick={true}
                expandedRowRender={(record) => (
                  <span>
                    <ReactJson src={record} enableClipboard={false} />
                    <Table
                      rowKey={(record) => record.id}
                      columns={this.nestedColumnsApplied}
                      dataSource={this.context.appliedDevices[record.id]}
                      pagination={false}
                    />
                    {/* <Table rowKey={record => record.id} columns={this.nestedColumnsTargeted} dataSource={this.props.targetedDevices[record.id]} pagination={false}/> */}
                  </span>
                )}
                pagination={{ pageSize: 50 }}
                // scroll={{ y: 1240 }}
              />
              <Popconfirm
                title="Delete all deployments?"
                onConfirm={this.onDelete}
                okText="Yes"
                cancelText="No"
              >
                <Button>Delete all</Button>
              </Popconfirm>
            </Col>
          </Row>
        </Content>
      </Layout>
    );
  }

  onDelete = async () => {
    //let result = await Axios.delete("api/deployment");
    //return result;    
  };

  componentDidMount() {
    //add if needed
  }
}
