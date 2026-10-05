import * as THREE from 'three';

/**
 * High-performance geometry cache to eliminate repeated BufferGeometry allocations,
 * reduce WebGL GPU buffer overhead, and cut garbage collection churn.
 */
class GeometryCache {
  private cylinderMap = new Map<string, THREE.CylinderGeometry>();
  private boxMap = new Map<string, THREE.BoxGeometry>();
  private torusMap = new Map<string, THREE.TorusGeometry>();
  private sphereMap = new Map<string, THREE.SphereGeometry>();

  private allCached = new Set<THREE.BufferGeometry>();

  public getCylinder(
    radiusTop: number,
    radiusBottom: number,
    height: number,
    radialSegments: number = 16,
    heightSegments: number = 1,
    openEnded: boolean = false
  ): THREE.CylinderGeometry {
    const key = `${radiusTop}_${radiusBottom}_${height}_${radialSegments}_${heightSegments}_${openEnded ? 1 : 0}`;
    let geo = this.cylinderMap.get(key);
    if (!geo) {
      geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded);
      this.cylinderMap.set(key, geo);
      this.allCached.add(geo);
    }
    return geo;
  }

  public getBox(width: number, height: number, depth: number): THREE.BoxGeometry {
    const key = `${width}_${height}_${depth}`;
    let geo = this.boxMap.get(key);
    if (!geo) {
      geo = new THREE.BoxGeometry(width, height, depth);
      this.boxMap.set(key, geo);
      this.allCached.add(geo);
    }
    return geo;
  }

  public getTorus(
    radius: number,
    tube: number,
    radialSegments: number = 8,
    tubularSegments: number = 24
  ): THREE.TorusGeometry {
    const key = `${radius}_${tube}_${radialSegments}_${tubularSegments}`;
    let geo = this.torusMap.get(key);
    if (!geo) {
      geo = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
      this.torusMap.set(key, geo);
      this.allCached.add(geo);
    }
    return geo;
  }

  public getSphere(
    radius: number,
    widthSegments: number = 24,
    heightSegments: number = 16
  ): THREE.SphereGeometry {
    const key = `${radius}_${widthSegments}_${heightSegments}`;
    let geo = this.sphereMap.get(key);
    if (!geo) {
      geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
      this.sphereMap.set(key, geo);
      this.allCached.add(geo);
    }
    return geo;
  }

  private generalMap = new Map<string, THREE.BufferGeometry>();

  public get<T extends THREE.BufferGeometry | null>(key: string, factory: () => T): T {
    let geo = this.generalMap.get(key) as (T & THREE.BufferGeometry) | undefined;
    if (geo === undefined) {
      const created = factory();
      if (created) {
        this.generalMap.set(key, created);
        this.allCached.add(created);
        return created as T;
      }
      return null as T;
    }
    return geo as T;
  }

  public isCached(geo: THREE.BufferGeometry | null | undefined): boolean {
    if (!geo) return false;
    return this.allCached.has(geo);
  }

  public has(key: string): boolean {
    return this.cylinderMap.has(key) ||
      this.boxMap.has(key) ||
      this.torusMap.has(key) ||
      this.sphereMap.has(key) ||
      this.generalMap.has(key);
  }

  public size(): number {
    return this.allCached.size;
  }

  public clear(): void {
    for (const geo of this.allCached) {
      geo.dispose();
    }

    this.allCached.clear();
    this.cylinderMap.clear();
    this.boxMap.clear();
    this.torusMap.clear();
    this.sphereMap.clear();
    this.generalMap.clear();
  }
}

export const geoCache = new GeometryCache();
