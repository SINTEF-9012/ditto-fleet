import React, { Component } from "react";
import ReactJson from "react-json-view";
import { Button, Table, Badge, Tag } from "antd";
import { DiversificationContext } from "./DiversificationContext";
import { GlobalContext } from "../GlobalContext";

const colors = [
  "blue",
  "red",
  "green",
  "blue",
  "red",
  "green",
  "blue",
  "red",
  "green",
];

export class DeviceStep extends Component {
  static contextType = DiversificationContext;  

  constructor(props) {
    super(props);
    this.device_columns = [
      {
        title: "Device ID",
        dataIndex: "id",
        width: 500,
        render: (text, record) => record.id,
      },
      /* {
        title: "Tags",
        dataIndex: "tags",
        render: (text, record) =>
          this.props.deviceTags[record.id] &&
          Object.keys(this.props.deviceTags[record.id]).map((key, i) => (
            <Tag color={colors[i]}>
              {key}: {this.props.deviceTags[record.id][key]}
            </Tag>
          )),
        width: 600,
      }, */      
    ];
    this.nested_device_columns = [
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
      device_list: { devices: {} },
      //devices: this.props.devices,
      //selected_device_rowkeys: this.props.selected_device_rowkeys,
      //visible: false
    };
  }

  handleDeviceSelectChange = (value) => {
    console.log("Selected devices changed: ", value);
    this.context.setSelectedDeviceRowKeys(value);
  };

  handleDeviceSelect = (record, selected, selectedRows, nativeEvent) => {
    //TODO: convert selected array into object
    // selectedRows.forEach((item, index) => {
    //     console.log(item, index);
    //   });

    var device_list = this.context.device_list;
    if (selected) {      
      device_list.devices[record.id] = record.tags;
      
    } else {
      delete device_list.devices[record.id];
    }
    this.context.setDeviceList(device_list);
  };

  render() {
    const device_row_selection = {
      selectedRowKeys: this.context.selected_device_rowkeys,
      columnTitle: " ", //FIXME: this line is to hide the "Select all" checkbox
      onChange: this.handleDeviceSelectChange,
      onSelect: this.handleDeviceSelect,
      //type: "radio"
    };

    return (
      <GlobalContext.Consumer>
        {({ devices, activeDeployments }) => (
          <Table
            //bordered
            rowSelection={device_row_selection}
            rowKey={(record) => record.id}
            size="small"
            dataSource={devices}
            columns={this.device_columns}
            expandedRowRender={(record) => (
              <span>
                <ReactJson src={record} enableClipboard={false} />
                <Table
                  columns={this.nested_device_columns}
                  dataSource={
                    activeDeployments[record.id]
                      ? Object.values(activeDeployments[record.id])
                      : []
                  }
                  pagination={false}
                />
              </span>
            )}
            pagination={{ pageSize: 50 }}
          />
        )}
      </GlobalContext.Consumer>
    );
  }

  componentDidMount() {
    //TODO
  }
}
