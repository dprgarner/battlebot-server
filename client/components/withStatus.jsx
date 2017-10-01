import Spinner from 'client/components/Spinner';
import { getDisplayName } from 'client/utils';

export default function statusWrapper(BaseComponent) {
  function StatusWrapped(props) {
    return (
      <div>
        <BaseComponent {...props} />
        { props.data.loading ? (
          <Spinner />
        ) : null }
        { props.data.error ? (
          <span>
            { props.data.error.message }
          </span>
        ) : null }
      </div>
    );
  }

  StatusWrapped.displayName = `StatusWrapped(${getDisplayName(BaseComponent)})`;

  return StatusWrapped;
}
