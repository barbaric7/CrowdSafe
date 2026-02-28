import numpy as np
from sklearn.linear_model import LinearRegression


class DensityPredictor:
    def __init__(self, lookback_window=5):
        self.lookback_window = lookback_window

    def predict_next(self, density_history):
        """
        Predict next density value using linear regression
        on recent density observations.
        """

        if len(density_history) < self.lookback_window:
            return None

        recent_values = density_history[-self.lookback_window:]
        y = np.array(recent_values)

        X = np.arange(len(y)).reshape(-1, 1)

        model = LinearRegression()
        model.fit(X, y)

        next_x = np.array([[len(y)]])
        prediction = model.predict(next_x)[0]

        return int(prediction)