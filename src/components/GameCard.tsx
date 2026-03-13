import Link from "next/link";
import styles from "./GameCard.module.css";
import Image from "next/image";

interface GameCardProps {
  id: string;
  title: string;
  developer: string;
  category: string;
  imageUrl: string;
  rating?: number;
}

export default function GameCard({ id, title, developer, category, imageUrl, rating }: GameCardProps) {
  // Using a fallback div if no actual image URL is provided initially
  const hasImage = imageUrl && imageUrl.startsWith("http");

  return (
    <Link href={`/games/${id}`} className={styles.card}>
      <div className={styles.imageContainer}>
        {hasImage ? (
          <Image 
            src={imageUrl} 
            alt={title} 
            fill 
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={styles.image} 
          />
        ) : (
          <div className={styles.placeholderImage}>
            <span className={styles.placeholderText}>{title.charAt(0)}</span>
          </div>
        )}
        <div className={styles.categoryBadge}>{category}</div>
      </div>
      
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          {rating && (
            <div className={styles.rating}>
              <span className={styles.star}>★</span>
              <span>{rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        
        <p className={styles.developer}>{developer}</p>
      </div>
    </Link>
  );
}
