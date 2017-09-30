import Spinner from 'client/components/Spinner';
import { getDisplayName } from 'client/utils';

export default function statusWrapper(BaseComponent) {
  function StatusWrapped(props) {
    if (props.data.loading) {
      return (
        <Spinner />
      );
    }

    if (props.data.error) {
      return (
        <span>
          { props.data.error.message }
        </span>
      );
    }

    return <BaseComponent {...props} />
  }

  StatusWrapped.displayName = `StatusWrapped(${getDisplayName(BaseComponent)})`;

  return StatusWrapped;
}
