import torch

# 创建训练数据；即 x_train 和 y_train
x_train = torch.tensor([[1.0], [2.0], [3.0], [4.0]], dtype=torch.float32)
y_train = torch.tensor([[0.0], [-1.0], [-2.0], [-3.0]], dtype=torch.float32)

# 构建模型
model = torch.nn.Linear(in_features=1, out_features=1)

# 定义损失函数
criterion = torch.nn.MSELoss()

# 定义优化器
optimizer = torch.optim.SGD(model.parameters(), lr=0.01)

# 训练模型
for epoch in range(1500):
    # 前向传播
    y_pred = model(x_train)
    loss = criterion(y_pred, y_train)

    # 反向传播
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

    # 记录训练损失
    if (epoch+1) % 100 == 0:
        print(f'Epoch [{epoch+1}/500], Loss: {loss.item():.4f}')

# 预测结果
x_test = torch.tensor([[10.0]], dtype=torch.float32)
y_test = model(x_test)
print(y_test)
