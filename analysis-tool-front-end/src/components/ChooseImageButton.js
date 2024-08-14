import styles from './courtBounds.module.css';

export const ChooseImageButton = ({ onFileInput }) => {
  return (
    <div className={styles.input}>
      <input
        id="fileInput"
        style={{ display: 'none' }}
        onChange={onFileInput}
        type="file"
        accept="image/*"
      />
      <label htmlFor="fileInput" class={styles.customFileLabel}>
        Upload Thumbnail
      </label>
    </div>
  );
};
