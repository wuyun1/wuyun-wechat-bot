import paddle as pd
import paddle.nn as nn
import paddle.optimizer as optim

x_train = pd.to_tensor([[1], [2], [3], [4]], dtype='float32')
y_train = pd.to_tensor([[0], [-1], [-2], [-3]], dtype='float32')

model = nn.Sequential(
    nn.Linear(1, 1)
)

criterion = nn.MSELoss()
optimizer = optim.SGD(parameters=model.parameters(), learning_rate=0.01)

for epoch in range(500):
    y_pred = model(x_train)
    loss = criterion(y_pred, y_train)
    optimizer.clear_grad()
    loss.backward()
    optimizer.step()

print(model(pd.to_tensor([10.0], dtype='float32')))
