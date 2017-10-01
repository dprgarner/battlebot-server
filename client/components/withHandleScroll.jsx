import _ from 'underscore';

import { getDisplayName } from 'client/utils';

export default function withHandleScroll(BaseComponent) {
  class WithHandleScroll extends React.Component {
    constructor(props) {
      super(props);
      this.onScroll = _.throttle(this.onScroll.bind(this), 10);
    }

    componentDidMount() {
      document.onscroll = this.onScroll;
    }

    componentWillUnmount() {
      document.onscroll = null;
    }

    onScroll() {
      if (!this.container) return;

      const bounds = this.container.getBoundingClientRect();
      if (bounds.top + bounds.height < 2000) {
        this.props.handleScroll();
      }
    }

    render() {
      return (
        <div ref={container => this.container = container}>
          <BaseComponent {...this.props} />
        </div>
      );
    }
  }

  WithHandleScroll.displayName = `WithHandleScroll(${getDisplayName(BaseComponent)})`;

  return WithHandleScroll;
}
