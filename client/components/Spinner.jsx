import styled, { keyframes } from 'styled-components';

const rotate360 = keyframes`
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
`;

const Circle = styled.div`
  border-radius: 50%;
  border: 15px solid #888;
  border-top: 15px solid rgba(136, 136, 136, 0.25);
  display: inline-block;
  width: 40px;
  height: 40px;
  animation: ${rotate360} 1.5s linear infinite;
`;

const SpinnerCentred = styled.div`
  text-align: center;
`;

export default function Spinner() {
  return (
    <SpinnerCentred>
      <Circle />
    </SpinnerCentred>
  )
}
