export type InputMovePayload = {
  x: number;
  y: number;
};

export type InputOverloadPayload = Record<string, never>;

export type InputRewardChosenPayload = {
  index: 0 | 1 | 2;
};
