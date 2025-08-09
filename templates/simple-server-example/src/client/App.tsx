import { useSync } from '@tldraw/sync'
import { useEffect, useState } from 'react'
import {
	AssetRecordType,
	getHashForString,
	TLAssetStore,
	TLBookmarkAsset,
	Tldraw,
	uniqueId,
} from 'tldraw'

const WORKER_URL = `https://tldraw-backend.ngx.zw-lab.net`

// Function to get room ID from URL
function getRoomIdFromUrl(): string {
	// Try to get room ID from pathname first (e.g., /room/my-room)
	const pathname = window.location.pathname
	const pathMatch = pathname.match(/\/room\/([^\/]+)/)
	if (pathMatch) {
		return pathMatch[1]
	}

	// Fallback to query parameter (e.g., ?room=my-room)
	const urlParams = new URLSearchParams(window.location.search)
	const roomParam = urlParams.get('room')
	if (roomParam) {
		return roomParam
	}

	// Default room ID
	return 'default-room'
}

// Function to update URL with room ID
function updateUrlWithRoomId(roomId: string) {
	const pathname = window.location.pathname
	const basePath = pathname.includes('/room/') ? pathname.replace(/\/room\/[^\/]+/, '') : pathname

	// Update pathname to include room ID
	const newPath = `${basePath}/room/${roomId}`
	window.history.pushState({ roomId }, '', newPath)
}

function App() {
	const [roomId, setRoomId] = useState(getRoomIdFromUrl())
	const [newRoomId, setNewRoomId] = useState('')
	const [showRoomSelector, setShowRoomSelector] = useState(false)

	// Create a store connected to multiplayer.
	const store = useSync({
		// We need to know the websocket's URI...
		uri: `${WORKER_URL}/connect/${roomId}`,
		// ...and how to handle static assets like images & videos
		assets: multiplayerAssets,
	})

	// Handle room switching
	const switchRoom = (newRoom: string) => {
		if (newRoom.trim()) {
			const cleanRoomId = newRoom
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9-_]/g, '-')
			setRoomId(cleanRoomId)
			updateUrlWithRoomId(cleanRoomId)
			setNewRoomId('')
			setShowRoomSelector(false)
		}
	}

	// Handle form submission
	const handleRoomSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		switchRoom(newRoomId)
	}

	// Handle browser back/forward
	useEffect(() => {
		const handlePopState = () => {
			const newRoomId = getRoomIdFromUrl()
			if (newRoomId !== roomId) {
				setRoomId(newRoomId)
			}
		}

		window.addEventListener('popstate', handlePopState)
		return () => window.removeEventListener('popstate', handlePopState)
	}, [roomId])

	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			{/* Room Selector UI */}
			<div
				style={{
					position: 'absolute',
					top: '10px',
					left: '10px',
					zIndex: 1000,
					background: 'white',
					border: '1px solid #ccc',
					borderRadius: '8px',
					padding: '10px',
					boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
					fontFamily: 'system-ui, -apple-system, sans-serif',
					fontSize: '14px',
					minWidth: '200px',
				}}
			>
				<div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Room: {roomId}</div>

				{showRoomSelector ? (
					<form
						onSubmit={handleRoomSubmit}
						style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
					>
						<input
							type="text"
							value={newRoomId}
							onChange={(e) => setNewRoomId(e.target.value)}
							placeholder="Enter room name"
							style={{
								padding: '4px 8px',
								border: '1px solid #ccc',
								borderRadius: '4px',
								fontSize: '12px',
							}}
						/>
						<div style={{ display: 'flex', gap: '4px' }}>
							<button
								type="submit"
								style={{
									padding: '4px 8px',
									background: '#007bff',
									color: 'white',
									border: 'none',
									borderRadius: '4px',
									fontSize: '12px',
									cursor: 'pointer',
								}}
							>
								Switch
							</button>
							<button
								type="button"
								onClick={() => setShowRoomSelector(false)}
								style={{
									padding: '4px 8px',
									background: '#6c757d',
									color: 'white',
									border: 'none',
									borderRadius: '4px',
									fontSize: '12px',
									cursor: 'pointer',
								}}
							>
								Cancel
							</button>
						</div>
					</form>
				) : (
					<div style={{ display: 'flex', gap: '4px' }}>
						<button
							onClick={() => setShowRoomSelector(true)}
							style={{
								padding: '4px 8px',
								background: '#28a745',
								color: 'white',
								border: 'none',
								borderRadius: '4px',
								fontSize: '12px',
								cursor: 'pointer',
							}}
						>
							Switch Room
						</button>
						<button
							onClick={() => {
								const randomRoom = 'room-' + Math.random().toString(36).substr(2, 9)
								switchRoom(randomRoom)
							}}
							style={{
								padding: '4px 8px',
								background: '#ffc107',
								color: 'black',
								border: 'none',
								borderRadius: '4px',
								fontSize: '12px',
								cursor: 'pointer',
							}}
						>
							Random
						</button>
					</div>
				)}

				<div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
					Share:{' '}
					<code style={{ background: '#f8f9fa', padding: '2px 4px', borderRadius: '2px' }}>
						{window.location.origin}/room/{roomId}
					</code>
				</div>
			</div>

			<Tldraw
				// we can pass the connected store into the Tldraw component which will handle
				// loading states & enable multiplayer UX like cursors & a presence menu
				store={store}
				onMount={(editor) => {
					// @ts-expect-error
					window.editor = editor
					// when the editor is ready, we need to register out bookmark unfurling service
					editor.registerExternalAssetHandler('url', unfurlBookmarkUrl)
				}}
			/>
		</div>
	)
}

// How does our server handle assets like images and videos?
const multiplayerAssets: TLAssetStore = {
	// to upload an asset, we prefix it with a unique id, POST it to our worker, and return the URL
	async upload(_asset, file) {
		const id = uniqueId()

		const objectName = `${id}-${file.name}`
		const url = `${WORKER_URL}/uploads/${encodeURIComponent(objectName)}`

		const response = await fetch(url, {
			method: 'PUT',
			body: file,
		})

		if (!response.ok) {
			throw new Error(`Failed to upload asset: ${response.statusText}`)
		}

		return { src: url }
	},
	// to retrieve an asset, we can just use the same URL. you could customize this to add extra
	// auth, or to serve optimized versions / sizes of the asset.
	resolve(asset) {
		// Ensure we're using the HTTPS URL for all assets
		const src = asset.props.src
		if (src && src.startsWith('http://10.2.100.21:5858')) {
			// Replace old HTTP URLs with HTTPS backend URL
			return src.replace('http://10.2.100.21:5858', WORKER_URL)
		}
		return src
	},
}

// How does our server handle bookmark unfurling?
async function unfurlBookmarkUrl({ url }: { url: string }): Promise<TLBookmarkAsset> {
	const asset: TLBookmarkAsset = {
		id: AssetRecordType.createId(getHashForString(url)),
		typeName: 'asset',
		type: 'bookmark',
		meta: {},
		props: {
			src: url,
			description: '',
			image: '',
			favicon: '',
			title: '',
		},
	}

	try {
		const response = await fetch(`${WORKER_URL}/unfurl?url=${encodeURIComponent(url)}`)
		const data = await response.json()

		asset.props.description = data?.description ?? ''
		asset.props.image = data?.image ?? ''
		asset.props.favicon = data?.favicon ?? ''
		asset.props.title = data?.title ?? ''
	} catch (e) {
		console.error(e)
	}

	return asset
}

export default App
