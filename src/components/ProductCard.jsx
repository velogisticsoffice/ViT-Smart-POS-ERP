import { useCart } from "../hooks";

export default function ProductCard({ product }) {
	const { addItem } = useCart();

	if (!product) return null;

	const { id, name, price, image } = product;

	const handleAdd = () => {
		addItem({ id, name, price, image, quantity: 1 });
	};

	return (
		<div className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-3">
			{image && <img src={image} alt={name} className="w-full h-36 object-cover rounded-lg" />}
			<div className="flex items-center justify-between">
				<div>
					<h3 className="font-semibold text-sm">{name}</h3>
					<p className="text-xs text-gray-500">₹{price}</p>
				</div>
				<button onClick={handleAdd} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm">
					Add
				</button>
			</div>
		</div>
	);
}
