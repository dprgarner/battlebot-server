import styled from 'styled-components';

export default styled.article`
  background-color: ${props => props.theme.background};
  border-radius: 5px;
  border: ${props => props.theme.border};
  margin: 15px;
  padding: 10px;
`;
