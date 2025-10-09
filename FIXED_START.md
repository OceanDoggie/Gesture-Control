# ✅ 问题已修复 - 正确启动方法

## 🔧 问题原因

1. **目录层级问题** - 有嵌套的 `GestureWorkshop` 文件夹
2. **PowerShell语法** - Windows PowerShell不支持 `&&` 命令连接符

## 📁 正确的项目路径

```
C:\Users\kerzh\Downloads\GestureWorkshop\GestureWorkshop\
```

注意：有两层GestureWorkshop文件夹！

---

## 🚀 正确的启动步骤

### 方法1: 使用启动脚本（最简单）

**在文件管理器中**:
1. 打开文件夹: `C:\Users\kerzh\Downloads\GestureWorkshop\GestureWorkshop`
2. 双击运行: `RUN_SERVER.bat`

### 方法2: 手动启动（推荐）

#### 步骤1: 打开第一个终端
在Cursor中按 `Ctrl + `` 打开终端，然后运行：

```powershell
# 进入正确的目录
cd C:\Users\kerzh\Downloads\GestureWorkshop\GestureWorkshop

# 启动后端
npm run backend
```

**等待看到**: `serving on port 5000` 或类似提示

#### 步骤2: 打开第二个终端  
按 `Ctrl + Shift + `` 打开新终端，然后运行：

```powershell
# 进入正确的目录
cd C:\Users\kerzh\Downloads\GestureWorkshop\GestureWorkshop

# 启动前端
npm run dev
```

**等待看到**: `Local: http://localhost:5173/`

---

## 🌐 访问网站

在浏览器中打开：
```
http://localhost:5173
```

## 🎯 测试AI手势识别

1. 点击顶部导航栏 **"Webcam"**
2. 点击 **"启动相机"** 按钮
3. 允许浏览器访问摄像头
4. 选择手势 (A-E)
5. 对着摄像头做出手势
6. 查看实时AI识别结果！

---

## ⚠️ 重要提示

### PowerShell命令注意事项

❌ **不要用** (会报错):
```powershell
cd GestureWorkshop && npm run dev
```

✅ **要用** (分开执行):
```powershell
cd GestureWorkshop
npm run dev
```

或者使用分号:
```powershell
cd GestureWorkshop; npm run dev
```

---

## 🛠️ 如果还是有问题

### 检查当前目录
```powershell
pwd
```

应该显示: `C:\Users\kerzh\Downloads\GestureWorkshop\GestureWorkshop`

### 检查package.json是否存在
```powershell
dir package.json
```

应该能看到 `package.json` 文件

### 重新安装依赖（如果需要）
```powershell
npm install
```

---

## 📊 服务状态检查

### 检查后端是否运行
在浏览器打开: `http://localhost:5000/api/health`

应该看到: `{"status":"healthy",...}`

### 检查前端是否运行
在浏览器打开: `http://localhost:5173`

应该看到网站首页

---

## 🎉 现在可以测试了！

两个服务都启动后，打开浏览器访问 `http://localhost:5173` 就可以开始测试AI手势识别了！

