import React, { useState } from 'react'
import { 
  Card, 
  Button, 
  Upload, 
  Modal, 
  Form, 
  Input, 
  message, 
  Table, 
  Space, 
  Popconfirm,
  Tag,
  Tooltip,
  Breadcrumb,
  Select
} from 'antd'
import {
  UploadOutlined,
  FolderAddOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
  SearchOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { fileApi, folderApi, api } from '../services/api'
import useAuthStore from '../stores/authStore'
import './FileManager.css'

const { Search } = Input
const { Option } = Select

interface FileItem {
  id: number
  name: string
  original_name: string
  size: number
  mime_type: string
  is_locked: boolean
  description: string
  tags: string
  created_at: string
  folder_id?: number
}

// 移除未使用的FolderItem接口

const FileManager: React.FC = () => {
  // const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [currentFolder, setCurrentFolder] = useState<number | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<number[]>([])
  const [searchText, setSearchText] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [folderModalVisible, setFolderModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingFile, setEditingFile] = useState<FileItem | null>(null)
  const [uploadForm] = Form.useForm()
  const [folderForm] = Form.useForm()
  const [editForm] = Form.useForm()

  // 获取文件列表
  const { data: filesData, isLoading: filesLoading, refetch: refetchFiles } = useQuery(
      ['files', currentFolder, searchText],
      () => fileApi.getFiles(currentFolder || undefined),
      {
        staleTime: 300000,
        keepPreviousData: true
      }
  )

  // 获取文件夹树
  // 暂时注释掉未使用的folderTree查询
  // const { data: folderTree } = useQuery(
  //   ['folderTree'],
  //   () => folderApi.getFolders(),
  //   { staleTime: 300000 }
  // )

  // 上传文件
  const uploadMutation = useMutation(
    (data: { files: File[]; folder_id?: number; description?: string; tags?: string }) => {
      if (data.files.length === 1) {
        // 简化参数传递，直接使用formData
          const formData = new FormData()
          formData.append('file', data.files[0])
          if (data.folder_id) {
            formData.append('folderId', data.folder_id.toString())
          }
          if (data.description) {
            formData.append('description', data.description)
          }
          if (data.tags) {
            formData.append('tags', data.tags)
          }
          return api.post('/files/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }).then(res => res.data)
      } else {
        // 简化多文件上传
          const promises = data.files.map(file => {
            const formData = new FormData()
            formData.append('file', file)
            if (data.folder_id) {
              formData.append('folderId', data.folder_id.toString())
            }
            if (data.description) {
              formData.append('description', data.description)
            }
            if (data.tags) {
              formData.append('tags', data.tags)
            }
            return api.post('/files/upload', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }).then(res => res.data)
          })
          return Promise.all(promises)
      }
    },
    {
      onSuccess: () => {
        message.success('文件上传成功')
        setUploadModalVisible(false)
        uploadForm.resetFields()
        refetchFiles()
      },
      onError: (error: any) => {
        message.error(error.response?.data?.error || '上传失败')
      }
    }
  )

  // 创建文件夹
  const createFolderMutation = useMutation(
    (data: { name: string; parent_id?: number }) => folderApi.createFolder(data),
    {
      onSuccess: () => {
        message.success('文件夹创建成功')
        setFolderModalVisible(false)
        folderForm.resetFields()
        queryClient.invalidateQueries('folderTree')
        refetchFiles()
      },
      onError: (error: any) => {
        message.error(error.response?.data?.error || '创建失败')
      }
    }
  )

  // 删除文件
  const deleteFileMutation = useMutation(
    (fileIds: number[]) => {
      if (fileIds.length === 1) {
        return fileApi.deleteFile(fileIds[0])
      } else {
        return fileApi.deleteFiles(fileIds)
      }
    },
    {
      onSuccess: () => {
        message.success('文件删除成功')
        setSelectedFiles([])
        refetchFiles()
      },
      onError: (error: any) => {
        message.error(error.response?.data?.error || '删除失败')
      }
    }
  )

  // 更新文件信息
  const updateFileMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => fileApi.updateFile(id, data),
    {
      onSuccess: () => {
        message.success('文件信息更新成功')
        setEditModalVisible(false)
        setEditingFile(null)
        editForm.resetFields()
        refetchFiles()
      },
      onError: (error: any) => {
        message.error(error.response?.data?.error || '更新失败')
      }
    }
  )

  // 锁定/解锁文件
  const lockFileMutation = useMutation(
    ({ id, isLocked }: { id: number; isLocked: boolean }) => 
      fileApi.lockFile(id, isLocked),
    {
      onSuccess: () => {
        message.success('操作成功')
        refetchFiles()
      },
      onError: (error: any) => {
        message.error(error.response?.data?.error || '操作失败')
      }
    }
  )

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.startsWith('video/')) return '🎥'
    if (mimeType.startsWith('audio/')) return '🎵'
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('word')) return '📝'
    if (mimeType.includes('excel')) return '📊'
    if (mimeType.includes('powerpoint')) return '📈'
    return '📁'
  }

  const handleUpload = (values: any) => {
    const { files, description, tags } = values
    if (!files || files.length === 0) {
      message.error('请选择要上传的文件')
      return
    }
    
    uploadMutation.mutate({
      files: Array.isArray(files) ? files : [files],
      folder_id: currentFolder || undefined,
      description,
      tags
    })
  }

  const handleCreateFolder = (values: { name: string }) => {
    createFolderMutation.mutate({
      name: values.name,
      parent_id: currentFolder || undefined
    })
  }

  const handleEditFile = (file: FileItem) => {
    setEditingFile(file)
    editForm.setFieldsValue({
      description: file.description,
      tags: file.tags
    })
    setEditModalVisible(true)
  }

  const handleUpdateFile = (values: any) => {
    if (!editingFile) return
    
    updateFileMutation.mutate({
      id: editingFile.id,
      data: values
    })
  }

  const handleDownload = async (file: FileItem) => {
    try {
      const response = await fileApi.downloadFile(file.id)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', file.original_name)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      message.error('下载失败')
    }
  }

  const handleBatchDownload = async () => {
    if (selectedFiles.length === 0) {
      message.warning('请选择要下载的文件')
      return
    }
    
    try {
      const response = await fileApi.downloadFiles(selectedFiles)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'files.zip')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      message.error('批量下载失败')
    }
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'original_name',
      key: 'name',
      render: (text: string, record: FileItem) => (
        <div className="file-name-cell">
          <span className="file-icon">{getFileIcon(record.mime_type)}</span>
          <div className="file-info">
            <div className="file-name">
              {text}
              {record.is_locked && <LockOutlined className="locked-icon" />}
            </div>
            {record.description && (
              <div className="file-description">{record.description}</div>
            )}
            {record.tags && (
              <div className="file-tags">
                {record.tags.split(',').map((tag, index) => (
                  <Tag key={index}>{tag.trim()}</Tag>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number) => formatFileSize(size)
    },
    {
      title: '类型',
      dataIndex: 'mime_type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color="blue">{type.split('/')[1]?.toUpperCase() || 'UNKNOWN'}</Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: FileItem) => (
        <Space>
          <Tooltip title="下载">
            <Button 
              type="text" 
              icon={<DownloadOutlined />} 
              onClick={() => handleDownload(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEditFile(record)}
            />
          </Tooltip>
          <Tooltip title={record.is_locked ? "解锁" : "锁定"}>
            <Button 
              type="text" 
              icon={record.is_locked ? <UnlockOutlined /> : <LockOutlined />}
              onClick={() => lockFileMutation.mutate({ 
                id: record.id, 
                isLocked: !record.is_locked 
              })}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个文件吗？"
            onConfirm={() => deleteFileMutation.mutate([record.id])}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="text" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const rowSelection = {
    selectedRowKeys: selectedFiles,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedFiles(selectedRowKeys as number[])
    }
  }

  return (
    <div className="file-manager">
      {/* 工具栏 */}
      <div className="file-manager-toolbar">
        <div className="toolbar-left">
          <Breadcrumb>
            <Breadcrumb.Item>
              <Button type="link" onClick={() => setCurrentFolder(null)}>
                根目录
              </Button>
            </Breadcrumb.Item>
            {currentFolder && (
              <Breadcrumb.Item>当前文件夹</Breadcrumb.Item>
            )}
          </Breadcrumb>
        </div>
        
        <div className="toolbar-right">
          <Search
            placeholder="搜索文件..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          
          <Select
            value={viewMode}
            onChange={setViewMode}
            style={{ width: 100 }}
          >
            <Option value="list">列表</Option>
            <Option value="grid">网格</Option>
          </Select>
          
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => refetchFiles()}
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="file-manager-actions">
        <Space>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            上传文件
          </Button>
          
          <Button
            icon={<FolderAddOutlined />}
            onClick={() => setFolderModalVisible(true)}
          >
            新建文件夹
          </Button>
          
          {selectedFiles.length > 0 && (
            <>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleBatchDownload}
              >
                批量下载 ({selectedFiles.length})
              </Button>
              
              <Popconfirm
                title={`确定要删除选中的 ${selectedFiles.length} 个文件吗？`}
                onConfirm={() => deleteFileMutation.mutate(selectedFiles)}
                okText="确定"
                cancelText="取消"
              >
                <Button icon={<DeleteOutlined />} danger>
                  批量删除
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      </div>

      {/* 文件列表 */}
      <Card className="file-list-card">
        <Table
          columns={columns}
          dataSource={filesData?.files || []}
          loading={filesLoading}
          rowKey="id"
          rowSelection={rowSelection}
          pagination={{
            total: filesData?.pagination?.total || 0,
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
        />
      </Card>

      {/* 上传文件模态框 */}
      <Modal
        title="上传文件"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={uploadForm}
          layout="vertical"
          onFinish={handleUpload}
        >
          <Form.Item
            name="files"
            label="选择文件"
            rules={[{ required: true, message: '请选择文件' }]}
          >
            <Upload.Dragger
              multiple
              beforeUpload={() => false}
              onChange={(info) => {
                uploadForm.setFieldsValue({ files: info.fileList.map(f => f.originFileObj).filter(Boolean) })
              }}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">支持单个或批量上传</p>
            </Upload.Dragger>
          </Form.Item>
          
          <Form.Item
            name="description"
            label="文件描述"
          >
            <Input.TextArea 
              placeholder="可选，为文件添加描述"
              rows={3}
            />
          </Form.Item>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Input placeholder="可选，用逗号分隔多个标签" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={uploadMutation.isLoading}
              >
                上传
              </Button>
              <Button onClick={() => setUploadModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 创建文件夹模态框 */}
      <Modal
        title="创建文件夹"
        open={folderModalVisible}
        onCancel={() => setFolderModalVisible(false)}
        footer={null}
      >
        <Form
          form={folderForm}
          layout="vertical"
          onFinish={handleCreateFolder}
        >
          <Form.Item
            name="name"
            label="文件夹名称"
            rules={[
              { required: true, message: '请输入文件夹名称' },
              { max: 100, message: '文件夹名称不能超过100字符' }
            ]}
          >
            <Input placeholder="请输入文件夹名称" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={createFolderMutation.isLoading}
              >
                创建
              </Button>
              <Button onClick={() => setFolderModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑文件模态框 */}
      <Modal
        title="编辑文件信息"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateFile}
        >
          <Form.Item
            name="description"
            label="文件描述"
          >
            <Input.TextArea 
              placeholder="为文件添加描述"
              rows={3}
            />
          </Form.Item>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Input placeholder="用逗号分隔多个标签" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={updateFileMutation.isLoading}
              >
                保存
              </Button>
              <Button onClick={() => setEditModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default FileManager
