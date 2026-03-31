<script setup>
import { onMounted, ref, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit } from '@element-plus/icons-vue'
import { getProductList, addProduct, updateProduct, deleteProduct } from '@/api/product'

const tableData = ref([])

async function loadList() {
  const res = await getProductList()
  tableData.value = Array.isArray(res) ? res : []
}

// ---- 弹窗 ----
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = reactive({ id: null, instId: '', instType: 'SWAP' })

const rules = {
  instId: [{ required: true, message: '请输入产品代码', trigger: 'blur' }],
  instType: [{ required: true, message: '请选择产品类型', trigger: 'change' }],
}

// 自动补全：只对不含 "-" 的纯币种名称补全
const suffixMap = { SWAP: '-USDT-SWAP', SPOT: '-USDT', FUTURES: '-USDT-FUTURES' }

function autoComplete() {
  const base = form.instId.trim().toUpperCase()
  if (!base || base.includes('-')) return
  form.instId = base + (suffixMap[form.instType] || '')
}

// 切换类型时，若当前是已补全的格式则重新补全
watch(
  () => form.instType,
  (newType) => {
    const current = form.instId.trim().toUpperCase()
    if (!current) return
    // 截取 base 部分（第一个 "-" 之前）
    const base = current.includes('-') ? current.split('-')[0] : current
    form.instId = base + (suffixMap[newType] || '')
  },
)

function openAdd() {
  isEdit.value = false
  Object.assign(form, { id: null, instId: '', instType: 'SWAP' })
  dialogVisible.value = true
}

function openEdit(row) {
  isEdit.value = true
  Object.assign(form, { ...row })
  dialogVisible.value = true
}

function handleSubmit() {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    if (isEdit.value) {
      await updateProduct(form.id, { instId: form.instId, instType: form.instType })
      ElMessage.success('修改成功')
    } else {
      await addProduct({ instId: form.instId, instType: form.instType })
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    loadList()
  })
}

function handleDelete(row) {
  ElMessageBox.confirm(`确认删除 ${row.instId}？`, '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      await deleteProduct(row.id)
      ElMessage.success('删除成功')
      loadList()
    })
    .catch(() => {})
}

onMounted(loadList)
</script>

<template>
  <div class="contract-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">合约管理</h2>
        <p class="page-desc">管理 OKX 产品列表</p>
      </div>
      <el-button type="primary" @click="openAdd">
        <el-icon style="margin-right: 4px"><Plus /></el-icon>添加产品
      </el-button>
    </div>

    <div class="table-card">
      <el-table :data="tableData" stripe style="width: 100%" table-layout="fixed">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="instId" label="产品代码" />
        <el-table-column prop="instType" label="产品类型">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="{ SPOT: 'success', SWAP: 'primary', FUTURES: 'warning' }[row.instType] || ''"
            >
              {{
                { SWAP: '永续合约', SPOT: '现货', FUTURES: '交割合约' }[row.instType] ||
                row.instType
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="openEdit(row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button size="small" text type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑产品' : '添加产品'"
      width="420px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="85px">
        <el-form-item label="产品代码" prop="instId">
          <el-input v-model="form.instId" placeholder="输入币种，如 BTC" @blur="autoComplete" />
        </el-form-item>
        <el-form-item label="产品类型" prop="instType">
          <el-select v-model="form.instType" style="width: 100%">
            <el-option label="永续合约 (SWAP)" value="SWAP" />
            <el-option label="现货 (SPOT)" value="SPOT" />
            <el-option label="交割合约 (FUTURES)" value="FUTURES" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.contract-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px;
}

.page-desc {
  font-size: 13px;
  color: #9ca3af;
  margin: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #eaecf0;
  overflow: hidden;
}
</style>
