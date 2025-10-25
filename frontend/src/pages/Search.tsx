import React, { useState } from 'react'
import { Card, Input, Button, Select, DatePicker, Table, Tag, Space, Typography, Empty } from 'antd'
import { SearchOutlined, FilterOutlined } from '@ant-design/icons'
import { useQuery } from 'react-query'
import { searchApi } from '../services/api'
import './Search.css'

const { Search } = Input
const { Option } = Select
const { RangePicker } = DatePicker
const { Title, Text } = Typography

interface SearchResult {
  id: number
  name: string
  original_name?: string
  size?: number
  mime_type?: string
  description?: string
  tags?: string
  created_at: string
  type: 'file' | 'folder'
}

const SearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'all' | 'files' | 'folders'>('all')
  const [filters, setFilters] = useState<any>({})
  const [advancedSearch, setAdvancedSearch] = useState(false)

  // 搜索建议
  const { data: suggestions } = useQuery(
    ['searchSuggestions', searchQuery],
    () => searchApi.getSuggestions(searchQuery),
    {
      enabled: searchQuery.length >= 2,
      staleTime: 30000
    }
  )

  // 热门搜索
  const { data: popularSearches } = useQuery(
    'popularSearches',
    () => searchApi.getPopularSearches(10),
    {
      staleTime: 300000 // 5分钟
    }
  )

  // 搜索结果
  const { data: searchResults, isLoading } = useQuery(
    ['searchResults', searchQuery, searchType, filters],
    () => {
      if (advancedSearch) {
        return searchApi.advancedSearch({
          query: searchQuery,
          type: searchType,
          filters,
          page: 1,
          limit: 20
        })
      } else {
        return searchApi.search({
          q: searchQuery,
          type: searchType,
          ...filters,
          page: 1,
          limit: 20
        })
      }
    },
    {
      enabled: !!searchQuery,
      keepPreviousData: true
    }
  )

  const handleSearch = (value: string) => {
    setSearchQuery(value)
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev: any) => ({
      ...prev,
      [key]: value
    }))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return '🖼️'
    if (mimeType?.startsWith('video/')) return '🎥'
    if (mimeType?.startsWith('audio/')) return '🎵'
    if (mimeType?.includes('pdf')) return '📄'
    if (mimeType?.includes('word')) return '📝'
    if (mimeType?.includes('excel')) return '📊'
    if (mimeType?.includes('powerpoint')) return '📈'
    return '📁'
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: SearchResult) => (
        <div className="search-result-item">
          <span className="result-icon">
            {record.type === 'file' ? getFileIcon(record.mime_type || '') : '📁'}
          </span>
          <div className="result-info">
            <div className="result-name">
              {record.original_name || text}
            </div>
            {record.description && (
              <div className="result-description">{record.description}</div>
            )}
            {record.tags && (
              <div className="result-tags">
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
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => (
        <Tag color={type === 'file' ? 'blue' : 'green'}>
          {type === 'file' ? '文件' : '文件夹'}
        </Tag>
      )
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number) => size ? formatFileSize(size) : '-'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => new Date(date).toLocaleString()
    }
  ]

  return (
    <div className="search-page">
      <div className="search-header">
        <Title level={2}>文件搜索</Title>
        <Text type="secondary">快速找到您需要的文件和文件夹</Text>
      </div>

      {/* 搜索框 */}
      <Card className="search-card">
        <div className="search-input-group">
          <Search
            placeholder="输入文件名、内容或标签进行搜索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSearch={handleSearch}
            size="large"
            enterButton={<SearchOutlined />}
            className="main-search-input"
          />
          
          <div className="search-options">
            <Select
              value={searchType}
              onChange={setSearchType}
              style={{ width: 120 }}
            >
              <Option value="all">全部</Option>
              <Option value="files">文件</Option>
              <Option value="folders">文件夹</Option>
            </Select>
            
            <Button
              icon={<FilterOutlined />}
              onClick={() => setAdvancedSearch(!advancedSearch)}
              type={advancedSearch ? 'primary' : 'default'}
            >
              高级搜索
            </Button>
          </div>
        </div>

        {/* 高级搜索选项 */}
        {advancedSearch && (
          <div className="advanced-search">
            <div className="search-filters">
              <div className="filter-group">
                <label>文件类型：</label>
                <Select
                  placeholder="选择文件类型"
                  style={{ width: 150 }}
                  allowClear
                  onChange={(value) => handleFilterChange('mime_type', value)}
                >
                  <Option value="image">图片</Option>
                  <Option value="video">视频</Option>
                  <Option value="audio">音频</Option>
                  <Option value="pdf">PDF</Option>
                  <Option value="word">Word</Option>
                  <Option value="excel">Excel</Option>
                  <Option value="powerpoint">PowerPoint</Option>
                </Select>
              </div>
              
              <div className="filter-group">
                <label>文件大小：</label>
                <Select
                  placeholder="最小大小"
                  style={{ width: 120 }}
                  allowClear
                  onChange={(value) => handleFilterChange('size_min', value)}
                >
                  <Option value="1024">1KB</Option>
                  <Option value="1048576">1MB</Option>
                  <Option value="10485760">10MB</Option>
                  <Option value="104857600">100MB</Option>
                </Select>
                <span> - </span>
                <Select
                  placeholder="最大大小"
                  style={{ width: 120 }}
                  allowClear
                  onChange={(value) => handleFilterChange('size_max', value)}
                >
                  <Option value="1048576">1MB</Option>
                  <Option value="10485760">10MB</Option>
                  <Option value="104857600">100MB</Option>
                  <Option value="1073741824">1GB</Option>
                </Select>
              </div>
              
              <div className="filter-group">
                <label>创建时间：</label>
                <RangePicker
                  onChange={(dates) => {
                    if (dates) {
                      handleFilterChange('date_from', dates[0]?.format('YYYY-MM-DD'))
                      handleFilterChange('date_to', dates[1]?.format('YYYY-MM-DD'))
                    }
                  }}
                />
              </div>
              
              <div className="filter-group">
                <label>标签：</label>
                <Input
                  placeholder="输入标签，用逗号分隔"
                  style={{ width: 200 }}
                  onChange={(e) => handleFilterChange('tags', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* 搜索建议 */}
        {suggestions && suggestions.length > 0 && (
          <div className="search-suggestions">
            <Text type="secondary">搜索建议：</Text>
            <Space wrap>
              {suggestions.map((suggestion: any, index: number) => (
                <Button
                  key={index}
                  type="link"
                  size="small"
                  onClick={() => setSearchQuery(suggestion.name)}
                >
                  {suggestion.name}
                </Button>
              ))}
            </Space>
          </div>
        )}

        {/* 热门搜索 */}
        {!searchQuery && popularSearches && (
          <div className="popular-searches">
            <Text type="secondary">热门搜索：</Text>
            <Space wrap>
              {popularSearches.popular.map((item: any, index: number) => (
                <Button
                  key={index}
                  type="link"
                  size="small"
                  onClick={() => setSearchQuery(item.term)}
                >
                  {item.term} ({item.count})
                </Button>
              ))}
            </Space>
          </div>
        )}
      </Card>

      {/* 搜索结果 */}
      {searchQuery && (
        <Card className="results-card">
          <div className="results-header">
            <Title level={4}>
              搜索结果
              {searchResults && (
                <Text type="secondary">
                  （共找到 {searchResults.pagination?.total || 0} 个结果）
                </Text>
              )}
            </Title>
          </div>
          
          {searchResults && searchResults.results && searchResults.results.length > 0 ? (
            <Table
              columns={columns}
              dataSource={searchResults.results}
              loading={isLoading}
              rowKey="id"
              pagination={{
                total: searchResults.pagination?.total || 0,
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
              }}
            />
          ) : searchQuery ? (
            <Empty
              description="没有找到相关结果"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : null}
        </Card>
      )}
    </div>
  )
}

export default SearchPage
